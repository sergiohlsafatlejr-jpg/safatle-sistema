import "dotenv/config";
import { ENV } from "../server/_core/env";

async function listModels() {
  const apiKey = ENV.forgeApiKey;
  if (!apiKey) {
    console.log("No API key found in ENV");
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.models) {
    data.models.forEach((m: any) => console.log(m.name, m.supportedGenerationMethods));
  } else {
    console.log("Error fetching models:", data);
  }
}

listModels();
