import { NextRequest } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { db, schema } from "@/lib/db";

const PACIENTE_ID = 1;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const archivo = formData.get("archivo") as File | null;
  const historia = formData.get("historia") as File | null;
  const procedimiento = formData.get("procedimiento") as string;
  const tipo = formData.get("tipo") as string;
  const observaciones = formData.get("observaciones") as string;

  if (!archivo || !procedimiento || !tipo) {
    return new Response(
      JSON.stringify({ error: "archivo, procedimiento y tipo son requeridos" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Save uploaded files to /tmp
  const tmpFormula = path.join("/tmp", `sura-formula-${Date.now()}.pdf`);
  await writeFile(tmpFormula, Buffer.from(await archivo.arrayBuffer()));

  let tmpHistoria: string | null = null;
  if (historia) {
    tmpHistoria = path.join("/tmp", `sura-historia-${Date.now()}.pdf`);
    await writeFile(tmpHistoria, Buffer.from(await historia.arrayBuffer()));
  }

  // Build script args
  const scriptPath = path.join(process.cwd(), "scripts", "solicitar-autorizacion.mjs");
  const args = [
    scriptPath,
    "--auto",
    "--procedimiento", procedimiento,
    "--tipo", tipo,
    "--archivo", tmpFormula,
    "--observaciones", observaciones || `Solicitud de ${procedimiento}`,
  ];
  if (tmpHistoria) {
    args.push("--historia", tmpHistoria);
  }

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("progress", { step: 0, message: "Iniciando automatización..." });

      // eslint-disable-next-line no-eval -- hide from Turbopack static analysis
      const cp = eval('require')('node:child_process');
      const child = cp.spawn("node", args, {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: "development" },
      });

      let output = "";
      let currentStep = 0;

      child.stdout.on("data", (chunk: { toString(): string }) => {
        const text = chunk.toString();
        output += text;

        // Parse step progress from script output
        const stepMatch = text.match(/\[(\d)\/8\]/);
        if (stepMatch) {
          currentStep = parseInt(stepMatch[1]);
        }

        // Extract meaningful lines
        const lines = text.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          const t = line.trim();
          if (/\[\d\/8\]/.test(t) || t.includes("OK") || t.includes("ERROR") || t.includes("WARN") || t.includes("══") || t.includes("Resolviendo") || t.includes("Esperando")) {
            send("progress", { step: currentStep, message: t });
          }
        }
      });

      child.stderr.on("data", (chunk: { toString(): string }) => {
        output += chunk.toString();
      });

      child.on("close", async (code: number | null) => {
        // Clean up temp files
        await unlink(tmpFormula).catch(() => {});
        if (tmpHistoria) await unlink(tmpHistoria).catch(() => {});

        // Parse result from output
        const solicitudMatch = output.match(/NumeroSolicitudSLW[":]+(\d+)/);
        const mensajeMatch = output.match(/"MensajeRespuesta":"([^"]+)"/);
        const errorMatch = output.match(/ERROR[:\s]+(.+)/);

        if (solicitudMatch) {
          const numero = solicitudMatch[1];
          const mensaje = mensajeMatch?.[1] || "Solicitud enviada";

          // Save to DB
          try {
            const tipoMap: Record<string, string> = {
              "6": "consulta", "1": "procedimiento", "2": "medicamento", "5": "reembolso",
            };
            await db.insert(schema.autorizaciones).values({
              pacienteId: PACIENTE_ID,
              especialidad: procedimiento,
              numero,
              tipo: tipoMap[tipo] || "consulta",
              estado: "solicitada",
            });
          } catch (e) {
            console.error("Error guardando en DB:", e);
          }

          send("done", { success: true, numero, mensaje });
        } else if (code !== 0 || errorMatch) {
          send("done", { success: false, error: errorMatch?.[1] || "El proceso falló" });
        } else {
          send("done", { success: false, error: "No se recibió respuesta del portal" });
        }

        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
