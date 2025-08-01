// Quick script for making sure sandboxes can be created and wait() without stalling.

import PQueue from "p-queue";
import { App } from "modal";

const app = await App.lookup("libmodal-example", { createIfMissing: true });
const image = await app.imageFromRegistry("python:3.13-slim");

async function createAndWaitOne() {
  const sb = await app.createSandbox(image);
  if (!sb.sandboxId) throw new Error("Sandbox ID is missing");
  await sb.terminate();
  const exitCode = await Promise.race([
    sb.wait(),
    new Promise<number>((_, reject) => {
      setTimeout(() => reject(new Error("wait() timed out")), 10000).unref();
    }),
  ]);
  console.log("Sandbox wait completed with exit code:", exitCode);
  if (exitCode !== 0) throw new Error(`Sandbox exited with code ${exitCode}`);
}

const queue = new PQueue({ concurrency: 50 });

let success = 0;
let failure = 0;

for (let i = 0; i < 150; i++) {
  await queue.onEmpty();

  queue.add(async () => {
    try {
      await createAndWaitOne();
      success++;
      console.log("Sandbox created and waited successfully.", i);
    } catch (error) {
      failure++;
      console.error("Error in sandbox creation/waiting:", error, i);
    }
  });
}

await queue.onIdle();
console.log("Success:", success);
console.log("Failure:", failure);
