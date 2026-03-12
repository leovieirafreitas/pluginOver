const { invoke } = window.__TAURI__.core;

let installMsg;

async function installPlugin() {
  if (installMsg) {
    installMsg.textContent = "Installing...";
    installMsg.className = "msg-info";
  }

  try {
    const response = await invoke("install_plugin");
    if (installMsg) {
      installMsg.textContent = response;
      installMsg.className = "msg-success";
    }
  } catch (error) {
    if (installMsg) {
      installMsg.textContent = error;
      installMsg.className = "msg-error";
    }
    console.error("Installation Error:", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  installMsg = document.querySelector("#install-msg");
  
  const installBtn = document.querySelector("#install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", installPlugin);
  }
});
