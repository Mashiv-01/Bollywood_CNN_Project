// Global variables
let trainingChart = null;
let pollInterval = null;
let isTrainingActive = false;
let isDownloadingActive = false;

// DOM Elements
const countSalman = document.getElementById('count-salman_khan');
const countShahRukh = document.getElementById('count-shah_rukh_khan');
const countBobby = document.getElementById('count-bobby_deol');
const btnDownloadDataset = document.getElementById('btn-download-dataset');
const btnTrainModel = document.getElementById('btn-train-model');
const modelStatusBadge = document.getElementById('model-status-badge');

const trainingConsole = document.getElementById('training-console');
const statusPulseDot = document.getElementById('status-pulse-dot');
const trainingStatusText = document.getElementById('training-status-text');
const trainingProgressFill = document.getElementById('training-progress-fill');
const metricEpoch = document.getElementById('metric-epoch');
const metricLoss = document.getElementById('metric-loss');
const metricAccuracy = document.getElementById('metric-accuracy');
const metricValAcc = document.getElementById('metric-val-acc');

const dropZone = document.getElementById('drop-zone');
const testImageUpload = document.getElementById('test-image-upload');
const previewImg = document.getElementById('preview-img');
const testImageUrl = document.getElementById('test-image-url');
const btnLoadUrl = document.getElementById('btn-load-url');
const resultsList = document.getElementById('results-list');
const activationGrid = document.getElementById('activation-grid');
const toastEl = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchDatasetInfo();
    setupEventListeners();
    startPollingStatus();
});

// Toast notification helper
function showToast(message, duration = 3000) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, duration);
}

// Chart.js configuration
function initChart() {
    const ctx = document.getElementById('trainingChart').getContext('2d');
    
    // Style configuration
    Chart.defaults.color = '#b8a6a0';
    Chart.defaults.font.family = "'DM Sans', sans-serif";

    trainingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Train Loss',
                    data: [],
                    borderColor: '#c45a70', // Cinematic rose
                    backgroundColor: 'rgba(196, 90, 112, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    yAxisID: 'y-loss',
                    tension: 0.3
                },
                {
                    label: 'Val Loss',
                    data: [],
                    borderColor: '#c45a70',
                    backgroundColor: 'rgba(196, 90, 112, 0.2)',
                    borderWidth: 2,
                    yAxisID: 'y-loss',
                    tension: 0.3
                },
                {
                    label: 'Train Acc',
                    data: [],
                    borderColor: '#b98550', // Warm bronze
                    backgroundColor: 'rgba(185, 133, 80, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    yAxisID: 'y-acc',
                    tension: 0.3
                },
                {
                    label: 'Val Acc',
                    data: [],
                    borderColor: '#e8be84', // Champagne gold
                    backgroundColor: 'rgba(232, 190, 132, 0.2)',
                    borderWidth: 2,
                    yAxisID: 'y-acc',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 15, padding: 15 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    title: { display: true, text: 'Epoch' }
                },
                'y-loss': {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    title: { display: true, text: 'Loss' },
                    min: 0
                },
                'y-acc': {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Accuracy' },
                    min: 0,
                    max: 1.0,
                    ticks: {
                        callback: function(value) {
                            return (value * 100) + '%';
                        }
                    }
                }
            }
        }
    });
}

// Fetch dataset size and model existence status
async function fetchDatasetInfo() {
    try {
        const res = await fetch('/api/dataset-info');
        const data = await res.json();
        
        countSalman.textContent = data.counts.salman_khan || 0;
        countShahRukh.textContent = data.counts.shah_rukh_khan || 0;
        countBobby.textContent = data.counts.bobby_deol || 0;
        
        const totalImages = (data.counts.salman_khan || 0) + (data.counts.shah_rukh_khan || 0) + (data.counts.bobby_deol || 0);
        
        if (data.model_exists) {
            modelStatusBadge.textContent = "Model Trained";
            modelStatusBadge.classList.add('trained');
        } else {
            modelStatusBadge.textContent = "Model Untrained";
            modelStatusBadge.classList.remove('trained');
        }
        
        // Disable training button if not enough images
        if (totalImages < 3) {
            btnTrainModel.disabled = true;
            btnTrainModel.title = "Download images first before training.";
        } else {
            btnTrainModel.disabled = isTrainingActive;
            btnTrainModel.title = "";
        }
    } catch (e) {
        console.error("Error fetching dataset info:", e);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Collect celebrity images button
    btnDownloadDataset.addEventListener('click', startDatasetDownload);
    
    // Train button
    btnTrainModel.addEventListener('click', startModelTraining);
    
    // Custom photo uploads for training
    document.querySelectorAll('.train-upload-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const player = e.target.dataset.player;
            const file = e.target.files[0];
            if (file) {
                uploadTrainingPhoto(player, file);
            }
        });
    });
    
    // Drag & Drop event handlers
    dropZone.addEventListener('click', () => testImageUpload.click());
    testImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleTestImage(file);
        }
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleTestImage(file);
        }
    });
    
    // URL loading
    btnLoadUrl.addEventListener('click', loadTestImageFromUrl);
    testImageUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadTestImageFromUrl();
        }
    });
}

// Start downloading dataset
async function startDatasetDownload() {
    if (isDownloadingActive) return;
    
    btnDownloadDataset.disabled = true;
    btnDownloadDataset.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';
    
    try {
        const res = await fetch('/api/download-dataset', { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'started') {
            showToast("Downloading celebrity images in background. This might take 30-60 seconds.");
            isDownloadingActive = true;
        } else {
            showToast(data.message || "Failed to start download.");
            btnDownloadDataset.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Collect Celebrity Images';
            btnDownloadDataset.disabled = false;
        }
    } catch (e) {
        console.error("Dataset download request failed:", e);
        showToast(`Could not start image collection: ${e.message}`);
        btnDownloadDataset.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Collect Celebrity Images';
        btnDownloadDataset.disabled = false;
        console.error(e);
    }
}

// Upload a single training photo
async function uploadTrainingPhoto(player, file) {
    const formData = new FormData();
    formData.append('player', player);
    formData.append('file', file);
    
    const celebrityName = ({ salman_khan: 'Salman Khan', shah_rukh_khan: 'Shah Rukh Khan', bobby_deol: 'Bobby Deol' })[player] || player;
    showToast(`Uploading photo for ${celebrityName}...`);
    
    try {
        const res = await fetch('/api/upload-training-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(`Uploaded training photo for ${celebrityName} successfully!`);
            fetchDatasetInfo();
        } else {
            showToast(data.detail || "Failed to upload image.");
        }
    } catch (e) {
        showToast("Error uploading image.");
        console.error(e);
    }
}

// Start Model Training
async function startModelTraining() {
    if (isTrainingActive) return;
    
    const epochs = document.getElementById('epochs').value;
    const batchSize = document.getElementById('batch_size').value;
    
    btnTrainModel.disabled = true;
    btnTrainModel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Training...';
    
    try {
        const res = await fetch(`/api/train?epochs=${epochs}&batch_size=${batchSize}`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'started') {
            showToast("Model training started in background.");
            isTrainingActive = true;
            trainingConsole.classList.remove('inactive');
            // Clear chart
            trainingChart.data.labels = [];
            trainingChart.data.datasets.forEach(d => d.data = []);
            trainingChart.update();
        } else {
            showToast(data.message || "Failed to start training.");
            btnTrainModel.innerHTML = '<i class="fa-solid fa-gears"></i> Train Convolutional Neural Network';
            btnTrainModel.disabled = false;
        }
    } catch (e) {
        showToast("Error starting training.");
        btnTrainModel.innerHTML = '<i class="fa-solid fa-gears"></i> Train Convolutional Neural Network';
        btnTrainModel.disabled = false;
        console.error(e);
    }
}

// Periodically check download and training status
function startPollingStatus() {
    pollInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            
            // Handle Download Status
            if (data.downloading) {
                isDownloadingActive = true;
                btnDownloadDataset.disabled = true;
                btnDownloadDataset.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';
            } else if (isDownloadingActive) {
                // Was downloading, now finished
                isDownloadingActive = false;
                btnDownloadDataset.disabled = false;
                btnDownloadDataset.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Collect Celebrity Images';
                const counts = data.download_summary || {};
                const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
                if (data.download_error) {
                    showToast("Collection finished with issues. Check the image counts and backend terminal.");
                } else if (total > 0) {
                    showToast(`Collection finished: ${total} images found. Check the celebrity counts.`);
                } else {
                    showToast("No images were downloaded. Check your internet connection and backend terminal.");
                }
                fetchDatasetInfo();
            }
            
            // Handle Training Status
            if (data.training) {
                isTrainingActive = true;
                btnTrainModel.disabled = true;
                btnTrainModel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Training...';
                trainingConsole.classList.remove('inactive');
                
                if (data.keras_logs) {
                    const logs = data.keras_logs;
                    const curEpoch = logs.current_epoch || 0;
                    const totEpochs = logs.total_epochs || 10;
                    const percent = Math.round((curEpoch / totEpochs) * 100);
                    
                    trainingStatusText.textContent = `Status: Training (Epoch ${curEpoch}/${totEpochs})`;
                    trainingProgressFill.style.width = `${percent}%`;
                    
                    const history = logs.history || {};
                    const lossLen = history.loss ? history.loss.length : 0;
                    
                    if (lossLen > 0) {
                        metricEpoch.textContent = `${curEpoch}/${totEpochs}`;
                        metricLoss.textContent = history.loss[lossLen - 1].toFixed(4);
                        metricAccuracy.textContent = (history.accuracy[lossLen - 1] * 100).toFixed(1) + '%';
                        metricValAcc.textContent = history.val_accuracy && history.val_accuracy.length > 0
                            ? (history.val_accuracy[lossLen - 1] * 100).toFixed(1) + '%'
                            : '-';
                            
                        // Sync Chart
                        const labels = Array.from({length: lossLen}, (_, i) => i + 1);
                        trainingChart.data.labels = labels;
                        trainingChart.data.datasets[0].data = history.loss;
                        trainingChart.data.datasets[1].data = history.val_loss || [];
                        trainingChart.data.datasets[2].data = history.accuracy;
                        trainingChart.data.datasets[3].data = history.val_accuracy || [];
                        trainingChart.update();
                    }
                }
            } else if (isTrainingActive) {
                // Was training, now finished
                isTrainingActive = false;
                btnTrainModel.disabled = false;
                btnTrainModel.innerHTML = '<i class="fa-solid fa-gears"></i> Train Convolutional Neural Network';
                trainingConsole.classList.add('inactive');
                trainingProgressFill.style.width = '0%';
                
                if (data.keras_logs && data.keras_logs.status === 'completed') {
                    showToast("CNN Model training completed! Ready for inference.");
                } else if (data.keras_logs && data.keras_logs.status === 'failed') {
                    showToast("Training failed: " + (data.keras_logs.error || "Unknown error"));
                }
                
                fetchDatasetInfo();
            } else {
                // Normal idle state, make sure buttons are in correct state
                fetchDatasetInfo();
            }
        } catch (e) {
            console.error("Error polling status:", e);
        }
    }, 1500);
}

// Load preview and trigger prediction
function handleTestImage(file) {
    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewImg.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Classify
    predictImageFile(file);
}

// Load test image from input URL
function loadTestImageFromUrl() {
    const url = testImageUrl.value.trim();
    if (!url) return;
    
    previewImg.style.display = 'none';
    showToast("Attempting to load image from URL...");
    
    // Create an image object to load URL and convert to blob via Canvas to bypass direct fetch CORS if needed
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], "url_image.jpg", { type: "image/jpeg" });
            previewImg.src = url;
            previewImg.style.display = 'block';
            predictImageFile(file);
        }, 'image/jpeg');
    };
    
    img.onerror = function() {
        showToast("CORS blocked loading, downloading URL on backend instead...");
        // Since JS canvas copy failed due to CORS, let's just fetch directly. 
        // We will modify our backend prediction endpoint or try to fetch it
        // Or tell the user to download and drag-and-drop.
        // Actually, we can download the image on the client side if possible, or send URL to a backend proxy if needed.
        // Let's suggest downloading.
        showToast("CORS restricted direct URL. Please download the image and drag-and-drop it!");
    };
    
    img.src = url;
}

// Post test image to predict endpoint
async function predictImageFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    resultsList.innerHTML = '<p class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> Running CNN inference...</p>';
    
    activationGrid.innerHTML = `
        <div class="placeholder-maps">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Extracting convolutional layer activation maps...</p>
        </div>
    `;
    
    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            renderPredictions(data.predictions);
            renderActivationMaps(data.activation_maps);
        } else {
            resultsList.innerHTML = `<p class="placeholder-text" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Prediction failed'}</p>`;
            activationGrid.innerHTML = `
                <div class="placeholder-maps">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>
                    <p>Failed to load activation maps.</p>
                </div>
            `;
        }
    } catch (e) {
        resultsList.innerHTML = '<p class="placeholder-text" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Network error running prediction.</p>';
        console.error(e);
    }
}

// Render inference classification results
function renderPredictions(predictions) {
    resultsList.innerHTML = '';
    
    if (!predictions || predictions.length === 0) {
        resultsList.innerHTML = '<p class="placeholder-text">No predictions found.</p>';
        return;
    }
    
    predictions.forEach(pred => {
        const percent = (pred.confidence * 100).toFixed(1);
        
        const itemHtml = `
            <div class="prediction-item">
                <div class="prediction-info-row">
                    <span class="player-name-label">${pred.class === 'shah_rukh_khan' ? 'Shah Rukh Khan' : pred.class === 'bobby_deol' ? 'Bobby Deol' : 'Salman Khan'}</span>
                    <span class="prediction-conf-val">${percent}%</span>
                </div>
                <div class="prediction-bar-container">
                    <div class="prediction-bar-fill pred-${pred.class}" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
        resultsList.insertAdjacentHTML('beforeend', itemHtml);
    });
}

// Render 16 Conv2D Layer Activation Maps
function renderActivationMaps(maps) {
    activationGrid.innerHTML = '';
    
    if (!maps || maps.length === 0) {
        activationGrid.innerHTML = `
            <div class="placeholder-maps">
                <i class="fa-solid fa-microscope"></i>
                <p>No feature maps found.</p>
            </div>
        `;
        return;
    }
    
    maps.forEach((base64Str, idx) => {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${base64Str}`;
        img.className = 'activation-map-img';
        img.alt = `Activation Filter ${idx + 1}`;
        img.title = `Conv2D Layer 1 - Filter ${idx + 1}`;
        activationGrid.appendChild(img);
    });
}
