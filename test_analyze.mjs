import fs from 'fs';

async function testApi() {
  const formData = new FormData();
  // Using a mock blob.
  const blob = new Blob(["mock fake audio binary xyz"], { type: "audio/webm" });
  formData.append("audio", blob);
  formData.append("word", "tradition");
  formData.append("difficulty", "intermediate");

  try {
    const res = await fetch("http://localhost:3000/api/analyze-speech", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testApi();
