
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/KVpy_kISg/";
const UMBRAL_CONFIANZA = 0.80;

let model = null;
let webcam = null;
let animationId = null;
let cameraRunning = false;
let loading = false;
let lastPredictionTime = 0;

const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");
const cameraMessage = document.getElementById("camera-message");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const webcamContainer = document.getElementById("webcam-container");

const resultPlaceholder = document.getElementById("result-placeholder");
const resultContent = document.getElementById("result-content");
const resultIcon = document.getElementById("result-icon");
const resultStatus = document.getElementById("result-status");
const resultTitle = document.getElementById("result-title");
const resultDescription = document.getElementById("result-description");
const confidenceValue = document.getElementById("confidence-value");
const confidenceFill = document.getElementById("confidence-fill");
const recommendationText = document.getElementById("recommendation-text");
const labelContainer = document.getElementById("label-container");

startButton.addEventListener("click", startScanner);
stopButton.addEventListener("click", stopScanner);

async function startScanner() {
    if (loading || cameraRunning) return;

    loading = true;
    startButton.disabled = true;
    startButton.textContent = "Cargando modelo...";
    cameraMessage.textContent = "Preparando la inteligencia artificial...";

    try {
        if (!model) {
            const modelURL = MODEL_URL + "model.json";
            const metadataURL = MODEL_URL + "metadata.json";
            model = await tmImage.load(modelURL, metadataURL);
        }

        webcam = new tmImage.Webcam(400, 300, true);
        await webcam.setup();
        await webcam.play();

        webcamContainer.replaceChildren(webcam.canvas);
        cameraPlaceholder.hidden = true;

        cameraRunning = true;
        stopButton.disabled = false;
        startButton.textContent = "Escáner activo";
        cameraMessage.textContent = "Cámara activa. Coloca un objeto frente a ella.";

        animationId = requestAnimationFrame(scanLoop);
    } catch (error) {
        console.error("Error al iniciar EcoScan:", error);

        cameraMessage.textContent =
            "No se pudo iniciar. Revisa los permisos de cámara y tu conexión.";

        startButton.disabled = false;
        startButton.textContent = "Intentar de nuevo";

        if (webcam) {
            try {
                webcam.stop();
            } catch (_) {}
            webcam = null;
        }

        cameraRunning = false;
    } finally {
        loading = false;
    }
}

async function scanLoop() {
    if (!cameraRunning || !webcam) return;

    webcam.update();

    // Limita las predicciones para no saturar el navegador.
    const now = Date.now();

    if (now - lastPredictionTime >= 250) {
        lastPredictionTime = now;

        try {
            const predictions = await model.predict(webcam.canvas);
            if (cameraRunning) showPrediction(predictions);
        } catch (error) {
            console.error("Error al analizar la imagen:", error);
            cameraMessage.textContent = "Hubo un problema analizando la imagen.";
        }
    }

    if (cameraRunning) {
        animationId = requestAnimationFrame(scanLoop);
    }
}

function normalizeLabel(label) {
    return label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function getClassType(label) {
    const normalized = normalizeLabel(label);

    if (normalized.includes("no reciclable")) {
        return "negative";
    }

    if (normalized.includes("reciclable")) {
        return "positive";
    }

    return "unknown";
}

function showPrediction(predictions) {
    if (!predictions || predictions.length === 0) return;

    const best = predictions.reduce((currentBest, item) =>
        item.probability > currentBest.probability ? item : currentBest
    );

    renderProbabilities(predictions);

    const confidence = best.probability;
    const percentage = Math.round(confidence * 100);

    resultPlaceholder.hidden = true;
    resultContent.hidden = false;

    confidenceValue.textContent = `${percentage}%`;
    confidenceFill.style.width = `${percentage}%`;

    // Si el modelo no alcanza el umbral, no afirma una respuesta.
    if (confidence < UMBRAL_CONFIANZA) {
        showUncertainResult(percentage);
        return;
    }

    const type = getClassType(best.className);

    if (type === "positive") {
        showClassResult({
            type: "positive",
            icon: "♻",
            status: "MATERIAL CLASIFICADO",
            title: "Parece reciclable",
            description: `El modelo identificó "${best.className}" con ${percentage}% de confianza.`,
            recommendation:
                "Comprueba el símbolo y el tipo de material. Si tu centro local lo acepta, límpialo y sepáralo según las indicaciones de reciclaje."
        });
    } else if (type === "negative") {
        showClassResult({
            type: "negative",
            icon: "↻",
            status: "MATERIAL CLASIFICADO",
            title: "Parece no reciclable",
            description: `El modelo identificó "${best.className}" con ${percentage}% de confianza.`,
            recommendation:
                "No lo coloques automáticamente en el contenedor de reciclaje. Revisa las normas locales y consulta si existe un punto de recolección especial."
        });
    } else {
        showUncertainResult(percentage);
    }
}

function showClassResult(data) {
    resultContent.className = `result-content ${data.type}`;
    resultIcon.textContent = data.icon;
    resultStatus.textContent = data.status;
    resultTitle.textContent = data.title;
    resultDescription.textContent = data.description;
    recommendationText.textContent = data.recommendation;
}

function showUncertainResult(percentage) {
    resultContent.className = "result-content unknown";
    resultIcon.textContent = "?";
    resultStatus.textContent = "CONFIANZA INSUFICIENTE";
    resultTitle.textContent = "No estoy seguro";
    resultDescription.textContent =
        `La predicción más alta fue de ${percentage}%, por debajo del umbral del ${UMBRAL_CONFIANZA * 100}%.`;
    recommendationText.textContent =
        "Acerca el objeto, mejora la iluminación, evita fondos con muchos elementos y vuelve a intentarlo. También puedes comprobar el material y sus símbolos de reciclaje manualmente.";
}

function renderProbabilities(predictions) {
    labelContainer.replaceChildren();

    predictions.forEach((prediction) => {
        const percentage = Math.round(prediction.probability * 100);

        const row = document.createElement("div");
        row.className = "probability-row";

        const heading = document.createElement("div");
        heading.className = "probability-label";

        const name = document.createElement("span");
        name.textContent = prediction.className;

        const value = document.createElement("strong");
        value.textContent = `${percentage}%`;

        heading.append(name, value);

        const track = document.createElement("div");
        track.className = "probability-track";

        const fill = document.createElement("div");
        fill.className = "probability-fill";
        fill.style.width = `${percentage}%`;

        track.appendChild(fill);
        row.append(heading, track);
        labelContainer.appendChild(row);
    });
}

function stopScanner() {
    cameraRunning = false;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (webcam) {
        try {
            webcam.stop();
        } catch (error) {
            console.warn("No se pudo detener la cámara:", error);
        }
        webcam = null;
    }

    webcamContainer.replaceChildren();
    cameraPlaceholder.hidden = false;

    stopButton.disabled = true;
    startButton.disabled = false;
    startButton.textContent = "Activar escáner";
    cameraMessage.textContent = "Escáner detenido. Puedes volver a iniciarlo.";

    resultContent.hidden = true;
    resultPlaceholder.hidden = false;
    resultPlaceholder.querySelector("h4").textContent = "Esperando un material";
    resultPlaceholder.querySelector("p").textContent =
        "El resultado aparecerá aquí cuando la cámara detecte un objeto.";

    labelContainer.replaceChildren();

    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-label";
    emptyMessage.textContent = "Los porcentajes aparecerán al analizar.";
    labelContainer.appendChild(emptyMessage);

    confidenceFill.style.width = "0%";
}

window.addEventListener("beforeunload", () => {
    cameraRunning = false;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    if (webcam) {
        webcam.stop();
    }
});

cameraPlaceholder.hidden = true;