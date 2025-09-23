const input = document.querySelector("input");
const qrImage = document.querySelector("img");
const generateBtn = document.querySelector("#generate");
const downloadBtn = document.querySelector("#download");

generateBtn.addEventListener("click", () => {
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${input.value}`;
  qrImage.src = qrCode;
});

downloadBtn.addEventListener("click", async () => {
  const response = await fetch(qrImage.src);
  const blob = await response.blob();
  const downloadlink = document.createElement("a");
  downloadlink.href = URL.createObjectURL(blob);
  downloadlink.download = "qrcode.jpg";
  downloadlink.click();
});