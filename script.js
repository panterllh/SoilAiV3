// ============================================
        // Utility Functions - Move to top
        // ============================================
        
        // Animate number values
        function animateValue(id, start, end, duration) {
            const element = document.getElementById(id);
            if (!element) return; // Check if element exists
            
            const range = end - start;
            const increment = range / (duration / 16);
            let current = start;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= end) {
                    current = end;
                    clearInterval(timer);
                }
                
                if (id === 'accuracyStat') {
                    element.textContent = Math.floor(current) + '%';
                } else {
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16);
        }
        
        function showMessage(message, type) {
            hideMessage();
            
            let element;
            if (type === 'error') {
                element = document.getElementById('errorMessage');
            } else if (type === 'success') {
                element = document.getElementById('successMessage');
            }
            
            if (element && element.querySelector) {
                const span = element.querySelector('span');
                if (span) {
                    span.textContent = message;
                    element.style.display = 'flex';
                    
                    // Auto hide after 5 seconds
                    setTimeout(hideMessage, 5000);
                }
            } else {
                // Fallback to toast if elements not found
                console.error('Message elements not found, using toast instead');
                showToast(message, type);
            }
        }
        
        function hideMessage() {
            const errorElement = document.getElementById('errorMessage');
            const successElement = document.getElementById('successMessage');
            
            if (errorElement) {
                errorElement.style.display = 'none';
            }
            if (successElement) {
                successElement.style.display = 'none';
            }
        }
        
        // Toast notifications
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) {
                console.error('Toast container not found');
                return;
            }
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            let icon = 'fa-info-circle';
            if (type === 'success') icon = 'fa-check-circle';
            else if (type === 'error') icon = 'fa-exclamation-circle';
            
            toast.innerHTML = `
                <i class="fas ${icon} toast-icon"></i>
                <span>${message}</span>
            `;
            
            container.appendChild(toast);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (container.contains(toast)) {
                        container.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }
        
        function updateStats() {
            const element = document.getElementById('analyzeCount');
            if (element) {
                element.textContent = analyzeCount;
            }
        }
        
        // ============================================
        // Global Variables
        // ============================================
        let model = null;
        let cameraStream = null;
        let currentCamera = 'environment';
        let analysisHistory = [];
        let analyzeCount = 0;
        let isModelReady = false;
        let isTensorFlowReady = false;
        
        // Soil type data
        const soilTypes = {
            0: {
                name: 'ดินร่วน',
                nameEn: 'Loam',
                icon: 'fa-seedling',
                iconText: '🌾',
                color: '#8B4513',
                phRange: { min: 6.0, max: 7.0 },
                moisture: 'ปกติ',
                tempRange: { min: 25, max: 30 },
                recommendations: [
                    { icon: 'fa-check-circle', text: 'เหมาะสำหรับปลูกพืชทั่วไป เช่น ผัก ไม้ดอก ไม้ผล' },
                    { icon: 'fa-tint', text: 'การระบายน้ำและอุ้มน้ำสมดุล รดน้ำ 2-3 วันครั้ง' },
                    { icon: 'fa-seedling', text: 'ควรใส่ปุ๋ยอินทรีย์หรือปุ๋ยคอก 2-3 กก./ตร.ม.' },
                    { icon: 'fa-chart-line', text: 'pH ที่เหมาะสม: 6.0-7.0 ใช้ปูนขาวปรับถ้า pH ต่ำ' },
                    { icon: 'fa-thermometer-half', text: 'อุณหภูมิที่เหมาะสม: 25-30°C' }
                ],
                suitablePlants: [
                    { name: 'ข้าวหอมมะลิ', icon: '🌾', type: 'พืชไร่' },
                    { name: 'มะเขือเทศ', icon: '🍅', type: 'ผัก' },
                    { name: 'พริก', icon: '🌶️', type: 'ผัก' },
                    { name: 'ผักบุ้ง', icon: '🥬', type: 'ผัก' },
                    { name: 'คะน้า', icon: '🥦', type: 'ผัก' },
                    { name: 'มะม่วง', icon: '🥭', type: 'ไม้ผล' },
                    { name: 'มะละกอ', icon: '🟠', type: 'ไม้ผล' },
                    { name: 'กล้วยน้ำว้า', icon: '🍌', type: 'ไม้ผล' },
                    { name: 'ดาวเรือง', icon: '🏵️', type: 'ไม้ดอก' },
                    { name: 'บานชื่น', icon: '🌺', type: 'ไม้ดอก' }
                ]
            },
            1: {
                name: 'ดินทราย',
                nameEn: 'Sand',
                icon: 'fa-umbrella-beach',
                iconText: '🏜️',
                color: '#F4A460',
                phRange: { min: 5.5, max: 7.0 },
                moisture: 'แห้ง',
                tempRange: { min: 28, max: 35 },
                recommendations: [
                    { icon: 'fa-tint', text: 'ต้องรดน้ำบ่อย (ทุกวัน) เพราะระบายน้ำเร็ว' },
                    { icon: 'fa-leaf', text: 'ควรผสมปุ๋ยคอกหรือปุ๋ยหมัก 3-5 กก./ตร.ม.' },
                    { icon: 'fa-carrot', text: 'เหมาะกับพืชรากลึก เช่น แครอท หัวไชเท้า มันฝรั่ง' },
                    { icon: 'fa-chart-line', text: 'pH ที่พบ: 5.5-7.0 ควรตรวจสอบบ่อย' },
                    { icon: 'fa-sun', text: 'ระวังการสูญเสียความชื้น ควรคลุมดิน' }
                ],
                suitablePlants: [
                    { name: 'มันสำปะหลัง', icon: '🌱', type: 'พืชไร่' },
                    { name: 'อ้อย', icon: '🎋', type: 'พืชไร่' },
                    { name: 'สับปะรด', icon: '🍍', type: 'ไม้ผล' },
                    { name: 'แตงโม', icon: '🍉', type: 'ผลไม้' },
                    { name: 'มะพร้าว', icon: '🥥', type: 'ไม้ผล' },
                    { name: 'ถั่วลิสง', icon: '🥜', type: 'พืชไร่' },
                    { name: 'มันเทศ', icon: '🍠', type: 'พืชหัว' },
                    { name: 'แครอท', icon: '🥕', type: 'พืชหัว' },
                    { name: 'หน่อไม้ฝรั่ง', icon: '🌿', type: 'ผัก' },
                    { name: 'ว่านหางจระเข้', icon: '🌵', type: 'สมุนไพร' }
                ]
            },
            2: {
                name: 'ดินเหนียว',
                nameEn: 'Clay',
                icon: 'fa-cube',
                iconText: '🟫',
                color: '#654321',
                phRange: { min: 5.0, max: 6.5 },
                moisture: 'ชื้น',
                tempRange: { min: 22, max: 28 },
                recommendations: [
                    { icon: 'fa-water', text: 'อุ้มน้ำดีแต่ระบายน้ำช้า รดน้ำ 4-5 วันครั้ง' },
                    { icon: 'fa-mountain', text: 'ควรผสมทรายหยาบหรือแกลบ 20-30%' },
                    { icon: 'fa-tractor', text: 'ต้องไถพรวนให้ดีก่อนปลูก เพิ่มอากาศในดิน' },
                    { icon: 'fa-chart-line', text: 'pH ที่พบ: 5.0-6.5 อาจต้องใช้ปูนขาว' },
                    { icon: 'fa-exclamation-triangle', text: 'ระวังน้ำท่วมขัง ควรยกแปลงปลูก' }
                ],
                suitablePlants: [
                    { name: 'ข้าวเหนียว', icon: '🌾', type: 'พืชไร่' },
                    { name: 'บัว', icon: '🪷', type: 'ไม้น้ำ' },
                    { name: 'ผักบุ้งน้ำ', icon: '🥬', type: 'ผักน้ำ' },
                    { name: 'ผักกระเฉด', icon: '🌿', type: 'ผักน้ำ' },
                    { name: 'ขิง', icon: '🫚', type: 'สมุนไพร' },
                    { name: 'ข่า', icon: '🌱', type: 'สมุนไพร' },
                    { name: 'ตะไคร้', icon: '🌾', type: 'สมุนไพร' },
                    { name: 'กล้วยหอม', icon: '🍌', type: 'ไม้ผล' },
                    { name: 'มะนาว', icon: '🍋', type: 'ไม้ผล' },
                    { name: 'ชมพู่', icon: '🍎', type: 'ไม้ผล' }
                ]
            }
        };
        
        // Wait for TensorFlow.js to be ready
        function waitForTensorFlow() {
            return new Promise((resolve) => {
                if (typeof tf !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(() => {
                        waitForTensorFlow().then(resolve);
                    }, 100);
                }
            });
        }
        
        // Initialize app with proper error handling
        async function initializeApp() {
            try {
                // Update preloader progress
                updatePreloaderProgress(10);
                
                // Wait for TensorFlow.js to be fully loaded
                await waitForTensorFlow();
                console.log('TensorFlow.js loaded:', tf.version.tfjs);
                updatePreloaderProgress(20);
                
                // Set backend explicitly and wait for it to be ready
                await tf.setBackend('webgl');
                await tf.ready();
                console.log('TensorFlow backend ready:', tf.getBackend());
                
                // Test TensorFlow is working
                const testTensor = tf.tensor([1, 2, 3]);
                await testTensor.data();
                testTensor.dispose();
                console.log('TensorFlow test passed');
                
                isTensorFlowReady = true;
                updatePreloaderProgress(30);
                
                // Load theme
                checkTheme();
                updatePreloaderProgress(40);
                
                // Setup event listeners
                setupEventListeners();
                updatePreloaderProgress(50);
                
                // Load model - MUST succeed for app to work
                try {
                    await loadModel();
                    updatePreloaderProgress(80);
                } catch (modelError) {
                    // If model fails to load, show instructions
                    hidePreloader();
                    
                    // Show detailed error modal
                    showModelErrorInstructions();
                    return; // Stop initialization
                }
                
                // Load history
                loadHistory();
                updatePreloaderProgress(90);
                
                // Update stats
                updateStats();
                updatePreloaderProgress(100);
                
                // Hide preloader
                setTimeout(() => {
                    hidePreloader();
                    showToast('ระบบพร้อมใช้งาน', 'success');
                }, 500);
                
            } catch (error) {
                console.error('Initialization error:', error);
                hidePreloader();
                showToast('เกิดข้อผิดพลาดในการเริ่มระบบ: ' + error.message, 'error');
            }
        }
        
        // Show detailed instructions when model fails to load
        function showModelErrorInstructions() {
            const instructionsHTML = `
                <div style="background: #fee; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 800px; border: 2px solid #dc2626;">
                    <h2 style="color: #dc2626; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> ไม่สามารถโหลด AI Model
                    </h2>
                    <p style="margin-bottom: 15px;">ระบบไม่สามารถโหลดไฟล์ model.json ได้ กรุณาตรวจสอบ:</p>
                    
                    <h3 style="margin-top: 20px;">📁 โครงสร้างไฟล์ที่ต้องการ:</h3>
                    <pre style="background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto;">
project-folder/
├── index.html (ไฟล์นี้)
└── tfjs_model/
    ├── model.json
    ├── group1-shard1of1.bin (หรือชื่อ weight file ตาม model.json)
    └── ... (weight files อื่นๆ ถ้ามี)
                    </pre>
                    
                    <h3 style="margin-top: 20px;">🔧 วิธีแก้ไข:</h3>
                    <ol style="line-height: 1.8;">
                        <li><strong>ตรวจสอบโฟลเดอร์:</strong> ต้องมีโฟลเดอร์ชื่อ "tfjs_model" อยู่ในระดับเดียวกับ index.html</li>
                        <li><strong>ตรวจสอบไฟล์:</strong> ต้องมีไฟล์ model.json และ weight files (.bin) ครบถ้วน</li>
                        <li><strong>CORS Policy:</strong> ถ้าเปิดไฟล์ด้วย file:// ต้องใช้ local server แทน:
                            <ul style="margin-top: 10px;">
                                <li>Python: <code>python -m http.server 8000</code></li>
                                <li>Node.js: <code>npx http-server</code></li>
                                <li>VS Code: ใช้ Live Server extension</li>
                            </ul>
                        </li>
                        <li><strong>ตรวจสอบ Console:</strong> กด F12 เพื่อดู error messages ใน Console</li>
                    </ol>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 5px;">
                        <strong>💡 หมายเหตุ:</strong> ระบบนี้ต้องใช้ไฟล์ model.json จริงเท่านั้น ไม่สามารถทำงานในโหมดจำลองได้
                    </div>
                    
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> โหลดใหม่
                    </button>
                </div>
            `;
            
            document.querySelector('.container').innerHTML = instructionsHTML;
        }
        
        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', async function() {
            // Check and clean storage first
            await checkAndCleanStorage();
            
            showPreloader();
            await initializeApp();
        });
        
        async function checkAndCleanStorage() {
            try {
                // Check storage size
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const storageEstimate = await navigator.storage.estimate();
                    const usedMB = (storageEstimate.usage / 1024 / 1024).toFixed(2);
                    const quotaMB = (storageEstimate.quota / 1024 / 1024).toFixed(2);
                    
                    console.log(`Storage: ${usedMB} MB / ${quotaMB} MB used`);
                    
                    // If using more than 50MB, clean up
                    if (storageEstimate.usage > 50 * 1024 * 1024) {
                        console.log('Cleaning up storage...');
                        clearOldData();
                    }
                }
            } catch (e) {
                console.log('Cannot check storage:', e);
            }
        }
        
        // Preloader functions
        function showPreloader() {
            document.getElementById('preloader').style.display = 'flex';
        }
        
        function hidePreloader() {
            const preloader = document.getElementById('preloader');
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
        
        function updatePreloaderProgress(percent) {
            document.getElementById('preloaderBar').style.width = percent + '%';
        }
        
        // Load TensorFlow model with better error handling
        async function loadModel() {
            try {
                // Check if TensorFlow is ready
                if (!isTensorFlowReady || typeof tf === 'undefined') {
                    throw new Error('TensorFlow.js not ready');
                }
                
                // Ensure backend is ready
                await tf.ready();
                
                // Update preloader text
                document.querySelector('.preloader-text').textContent = 'กำลังโหลด AI Model...';
                
                // Try multiple paths for the model
                const modelPaths = [
                    './tfjs_model/model.json',
                    '/tfjs_model/model.json',
                    'tfjs_model/model.json',
                    '../tfjs_model/model.json',
                    './SoilAiV2/tfjs_model/model.json',
                    'https://raw.githubusercontent.com/yourusername/yourrepo/main/tfjs_model/model.json'
                ];
                
                let modelLoaded = false;
                let lastError = null;
                
                // Try each path
                for (const path of modelPaths) {
                    try {
                        console.log('Attempting to load model from:', path);
                        
                        // Load the model with error handling
                        model = await tf.loadLayersModel(path);
                        
                        // Verify model loaded correctly
                        console.log('Model loaded, checking structure...');
                        console.log('Model input shape:', model.inputs[0].shape);
                        console.log('Model output shape:', model.outputs[0].shape);
                        
                        // Warmup the model
                        console.log('Warming up model...');
                        const dummyInput = tf.zeros([1, 224, 224, 3]);
                        const warmupResult = model.predict(dummyInput);
                        const warmupData = await warmupResult.data();
                        warmupResult.dispose();
                        dummyInput.dispose();
                        
                        console.log('✅ Model loaded and verified successfully');
                        console.log('Warmup predictions:', warmupData);
                        
                        modelLoaded = true;
                        isModelReady = true;
                        break;
                        
                    } catch (error) {
                        lastError = error;
                        console.error(`Failed to load from ${path}:`, error.message);
                        
                        // If CORS error, suggest solution
                        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                            console.warn('💡 CORS error detected. Model files must be served from the same domain or have proper CORS headers.');
                        }
                        
                        continue;
                    }
                }
                
                if (!modelLoaded) {
                    throw new Error(`Could not load model from any path. Last error: ${lastError?.message}`);
                }
                
                // Update stats
                animateValue('accuracyStat', 0, 96, 2000);
                animateValue('imagesStat', 0, 180, 2000);
                
            } catch (error) {
                console.error('Critical error loading model:', error);
                isModelReady = false;
                
                // Show detailed error message
                showToast(`ไม่สามารถโหลด Model: ${error.message}`, 'error');
                
                // Provide instructions
                setTimeout(() => {
                    showMessage('กรุณาตรวจสอบว่าไฟล์ model.json และ weight files อยู่ในโฟลเดอร์ tfjs_model/', 'error');
                }, 1000);
                
                throw error; // Re-throw to stop initialization
            }
        }
        
        // ============================================
        // Color Analysis Helper
        // ============================================
        async function analyzeImageColors(imgElement) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size
                canvas.width = imgElement.width;
                canvas.height = imgElement.height;
                
                // Draw image to canvas
                ctx.drawImage(imgElement, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Calculate color statistics
                let rSum = 0, gSum = 0, bSum = 0;
                let rMin = 255, gMin = 255, bMin = 255;
                let rMax = 0, gMax = 0, bMax = 0;
                let pixelCount = 0;
                
                // Color histogram for dominant colors
                const colorBins = {};
                
                // Process pixels
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    
                    // Skip transparent pixels
                    if (a < 128) continue;
                    
                    // Update sums
                    rSum += r;
                    gSum += g;
                    bSum += b;
                    pixelCount++;
                    
                    // Update min/max
                    rMin = Math.min(rMin, r);
                    gMin = Math.min(gMin, g);
                    bMin = Math.min(bMin, b);
                    rMax = Math.max(rMax, r);
                    gMax = Math.max(gMax, g);
                    bMax = Math.max(bMax, b);
                    
                    // Create color bin (reduce colors to 32 levels per channel)
                    const binR = Math.floor(r / 8) * 8;
                    const binG = Math.floor(g / 8) * 8;
                    const binB = Math.floor(b / 8) * 8;
                    const binKey = `${binR},${binG},${binB}`;
                    
                    colorBins[binKey] = (colorBins[binKey] || 0) + 1;
                }
                
                // Calculate averages
                const rAvg = rSum / pixelCount;
                const gAvg = gSum / pixelCount;
                const bAvg = bSum / pixelCount;
                
                // Find dominant colors
                const sortedColors = Object.entries(colorBins)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([color, count]) => {
                        const [r, g, b] = color.split(',').map(Number);
                        return { r, g, b, percentage: (count / pixelCount) * 100 };
                    });
                
                // Calculate color characteristics
                const brightness = (rAvg + gAvg + bAvg) / 3;
                const saturation = Math.max(rAvg, gAvg, bAvg) - Math.min(rAvg, gAvg, bAvg);
                
                // Calculate brown/red ratio (important for soil)
                const brownScore = (rAvg > gAvg && gAvg > bAvg) ? 
                    (rAvg - bAvg) / 255 : 0;
                
                // Calculate gray/sandy score
                const grayScore = Math.abs(rAvg - gAvg) < 20 && 
                                 Math.abs(gAvg - bAvg) < 20 && 
                                 Math.abs(rAvg - bAvg) < 20 ? 1 : 0;
                
                // Calculate darkness (clay indicator)
                const darknessScore = 1 - (brightness / 255);
                
                resolve({
                    average: { r: rAvg, g: gAvg, b: bAvg },
                    min: { r: rMin, g: gMin, b: bMin },
                    max: { r: rMax, g: gMax, b: bMax },
                    dominantColors: sortedColors,
                    characteristics: {
                        brightness: brightness / 255,
                        saturation: saturation / 255,
                        brownScore,
                        grayScore,
                        darknessScore
                    }
                });
            });
        }
        
        // Combine model predictions with color analysis
        function combineAnalysisResults(modelPredictions, colorAnalysis) {
            // Get base predictions from model
            let combinedPredictions = [...modelPredictions];
            
            // Apply color-based adjustments
            const { brownScore, grayScore, darknessScore } = colorAnalysis.characteristics;
            
            // Weights for color influence (30% color, 70% model)
            const colorWeight = 0.3;
            const modelWeight = 0.7;
            
            // Calculate color-based predictions
            let colorPredictions = [0, 0, 0];
            
            // Loam (brownish soil)
            if (brownScore > 0.3) {
                colorPredictions[0] = brownScore;
            }
            
            // Sand (light/gray soil)
            if (grayScore > 0.5 || colorAnalysis.characteristics.brightness > 0.6) {
                colorPredictions[1] = Math.max(grayScore, colorAnalysis.characteristics.brightness - 0.3);
            }
            
            // Clay (dark soil)
            if (darknessScore > 0.5) {
                colorPredictions[2] = darknessScore;
            }
            
            // Normalize color predictions
            const colorSum = colorPredictions.reduce((a, b) => a + b, 0);
            if (colorSum > 0) {
                colorPredictions = colorPredictions.map(p => p / colorSum);
            } else {
                // If no clear color pattern, use equal weights
                colorPredictions = [0.33, 0.33, 0.34];
            }
            
            // Combine model and color predictions
            for (let i = 0; i < 3; i++) {
                combinedPredictions[i] = (modelPredictions[i] * modelWeight) + 
                                        (colorPredictions[i] * colorWeight);
            }
            
            // Normalize final predictions
            const finalSum = combinedPredictions.reduce((a, b) => a + b, 0);
            combinedPredictions = combinedPredictions.map(p => p / finalSum);
            
            // Log analysis details
            console.log('Color Analysis:', {
                average: colorAnalysis.average,
                characteristics: colorAnalysis.characteristics,
                colorPredictions,
                modelPredictions,
                combinedPredictions
            });
            
            return {
                predictions: combinedPredictions,
                colorAnalysis: colorAnalysis,
                confidenceBoost: calculateConfidenceBoost(modelPredictions, colorPredictions)
            };
        }
        
        // Calculate confidence boost from color agreement
        function calculateConfidenceBoost(modelPred, colorPred) {
            // Find the index with highest prediction for both
            const modelMax = Math.max(...modelPred);
            const modelIndex = modelPred.indexOf(modelMax);
            const colorMax = Math.max(...colorPred);
            const colorIndex = colorPred.indexOf(colorMax);
            
            // If both agree, boost confidence
            if (modelIndex === colorIndex) {
                return 0.1; // 10% boost
            }
            
            return 0; // No boost if they disagree
        }
        
        // Setup event listeners
        function setupEventListeners() {
            const uploadArea = document.getElementById('uploadArea');
            const imageInput = document.getElementById('imageInput');
            
            // Click to upload
            uploadArea.addEventListener('click', () => imageInput.click());
            
            // File input change
            imageInput.addEventListener('change', handleFileSelect);
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                handleFiles(e.dataTransfer.files);
            });
            
            // Smooth scroll for navigation links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
            
            // Mobile menu toggle
            document.querySelector('.mobile-menu-toggle').addEventListener('click', () => {
                document.querySelector('.nav-links').classList.toggle('show');
            });
        }
        
        // ============================================
        // File Handling
        // ============================================
        function handleFileSelect(e) {
            handleFiles(e.target.files);
        }
        
        function handleFiles(files) {
            if (files.length === 0) return;
            handleSingleFile(files[0]);
        }
        
        function handleSingleFile(file) {
            if (!validateFile(file)) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('previewImage');
                preview.src = e.target.result;
                document.getElementById('previewContainer').style.display = 'block';
                document.getElementById('analyzeBtn').style.display = 'inline-flex';
                document.getElementById('emptyResult').style.display = 'none';
                
                // Add animation
                preview.classList.add('animate-fadeIn');
            };
            reader.readAsDataURL(file);
        }
        
        function validateFile(file) {
            if (!file.type.startsWith('image/')) {
                showMessage('กรุณาเลือกไฟล์รูปภาพ', 'error');
                return false;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                showMessage('ไฟล์ใหญ่เกิน 10MB', 'error');
                return false;
            }
            
            return true;
        }
        
        // ============================================
        // Image Analysis with Memory Management
        // ============================================
        async function analyzeImage() {
            const preview = document.getElementById('previewImage');
            if (!preview.src || preview.src === window.location.href) {
                showMessage('กรุณาเลือกรูปก่อน', 'error');
                return;
            }
            
            if (!isModelReady || !isTensorFlowReady) {
                showMessage('ระบบยังไม่พร้อม กรุณารอสักครู่', 'error');
                return;
            }
            
            // Show loading
            document.getElementById('loading').style.display = 'block';
            document.getElementById('analyzeBtn').style.display = 'none';
            
            let inputTensor = null;
            
            try {
                // Ensure TensorFlow is ready
                await tf.ready();
                
                // Check storage quota
                if (!await checkStorageQuota()) {
                    clearOldData();
                }
                
                // Preprocess image with TensorFlow
                inputTensor = await preprocessImage(preview);
                console.log('Input tensor shape:', inputTensor.shape);
                
                // Make prediction using TensorFlow model
                const outputTensor = model.predict(inputTensor);
                const predictions = await outputTensor.data();
                outputTensor.dispose();
                
                console.log('Predictions:', predictions);
                
                // Process results
                const result = processResults(predictions);
                
                // Compress image before saving
                result.imageData = await compressImage(preview.src);
                result.timestamp = new Date();
                
                // Show results with animation
                displayResults(result);
                
                // Update stats
                analyzeCount++;
                updateStats();
                
                // Save to recent analyses
                saveToRecent(result);
                
                showToast('วิเคราะห์เสร็จสิ้น', 'success');
                
            } catch (error) {
                console.error('Analysis error:', error);
                showMessage('เกิดข้อผิดพลาดในการวิเคราะห์: ' + error.message, 'error');
                
                // Log more details for debugging
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    tfBackend: typeof tf !== 'undefined' ? tf.getBackend() : 'TF not loaded',
                    modelReady: isModelReady,
                    tfReady: isTensorFlowReady
                });
                
            } finally {
                // Always dispose tensor to prevent memory leak
                if (inputTensor) {
                    inputTensor.dispose();
                }
                
                // Clean up any leaked tensors
                if (typeof tf !== 'undefined') {
                    const numTensors = tf.memory().numTensors;
                    console.log('Number of tensors in memory:', numTensors);
                    
                    // If too many tensors, dispose all variables
                    if (numTensors > 10) {
                        tf.disposeVariables();
                    }
                }
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('analyzeBtn').style.display = 'inline-flex';
            }
        }
        
        // Check storage quota
        async function checkStorageQuota() {
            try {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const {usage, quota} = await navigator.storage.estimate();
                    const percentUsed = (usage / quota) * 100;
                    console.log(`Storage: ${(usage / 1024 / 1024).toFixed(2)} MB / ${(quota / 1024 / 1024).toFixed(2)} MB (${percentUsed.toFixed(2)}%)`);
                    
                    // If more than 80% used, need cleanup
                    return percentUsed < 80;
                }
            } catch (e) {
                console.error('Cannot check storage quota:', e);
            }
            return true;
        }
        
        // Compress image to reduce storage
        async function compressImage(imageSrc) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Max dimensions
                    const maxWidth = 800;
                    const maxHeight = 600;
                    
                    let width = img.width;
                    let height = img.height;
                    
                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress as JPEG with 70% quality
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = imageSrc;
            });
        }
        
        // Clear old data to free up space
        function clearOldData() {
            try {
                // Clear old history but keep recent 10
                let history = JSON.parse(localStorage.getItem('soilAnalysisHistory') || '[]');
                if (history.length > 10) {
                    history = history.slice(-10);
                    localStorage.setItem('soilAnalysisHistory', JSON.stringify(history));
                }
                
                // Clear recent analyses but keep last 3
                let recent = JSON.parse(localStorage.getItem('recentAnalyses') || '[]');
                if (recent.length > 3) {
                    recent = recent.slice(0, 3);
                    localStorage.setItem('recentAnalyses', JSON.stringify(recent));
                }
                
                // Clear other unnecessary data
                const keysToCheck = Object.keys(localStorage);
                keysToCheck.forEach(key => {
                    // Remove old/temporary data
                    if (key.startsWith('temp_') || key.startsWith('old_')) {
                        localStorage.removeItem(key);
                    }
                });
                
                console.log('Old data cleared successfully');
            } catch (e) {
                console.error('Error clearing old data:', e);
            }
        }
        
        async function preprocessImage(imgElement) {
            // Ensure TensorFlow is ready
            if (typeof tf === 'undefined') {
                throw new Error('TensorFlow.js not available');
            }
            
            // Double check backend is ready
            await tf.ready();
            
            // Process image inside tidy to prevent memory leaks
            const processedTensor = tf.tidy(() => {
                try {
                    // Convert image to tensor
                    const imgTensor = tf.browser.fromPixels(imgElement, 3);
                    
                    // Convert to float and normalize to [0, 1]
                    const normalized = imgTensor.toFloat().div(tf.scalar(255.0));
                    
                    // Resize to model input size
                    const resized = tf.image.resizeBilinear(normalized, [224, 224]);
                    
                    // Add batch dimension [1, 224, 224, 3]
                    const batched = resized.expandDims(0);
                    
                    // Return the processed tensor
                    return batched;
                    
                } catch (error) {
                    console.error('Error in image preprocessing:', error);
                    throw error;
                }
            });
            
            return processedTensor;
        }
        
        function processResults(predictions) {
            const maxIndex = predictions.indexOf(Math.max(...predictions));
            const confidence = predictions[maxIndex];
            const soilData = soilTypes[maxIndex];
            
            // Generate values
            const phMin = soilData.phRange.min;
            const phMax = soilData.phRange.max;
            const phValue = `${phMin}-${phMax}`;
            
            const moistureValue = soilData.moisture;
            
            const tempMin = soilData.tempRange.min;
            const tempMax = soilData.tempRange.max;
            const tempValue = `${tempMin}-${tempMax}`;
            
            return {
                soilType: maxIndex,
                soilData: soilData,
                confidence: confidence,
                allPredictions: Array.from(predictions),
                phValue: phValue,
                moistureValue: moistureValue,
                tempValue: tempValue
            };
        }
        
        // ============================================
        // Display Results
        // ============================================
        function displayResults(result) {
            // Show result section with animation
            const resultDisplay = document.getElementById('resultDisplay');
            resultDisplay.style.display = 'block';
            resultDisplay.classList.add('animate-fadeIn');
            document.getElementById('emptyResult').style.display = 'none';
            
            // Update soil type with icon
            const iconElement = document.getElementById('soilIcon');
            iconElement.innerHTML = `<i class="fas ${result.soilData.icon} animate-bounceIn" style="font-size: 5rem; color: ${result.soilData.color};"></i>`;
            document.getElementById('soilName').textContent = 
                `${result.soilData.name} (${result.soilData.nameEn})`;
            
            // Update confidence bar with animation
            const confidencePercent = (result.confidence * 100).toFixed(1);
            const confidenceFill = document.getElementById('confidenceFill');
            
            // Reset and animate
            confidenceFill.style.width = '0%';
            setTimeout(() => {
                confidenceFill.style.width = `${confidencePercent}%`;
                confidenceFill.textContent = `${confidencePercent}%`;
            }, 100);
            
            // Update values with animation
            document.getElementById('phValue').textContent = result.phValue;
            document.getElementById('moistureValue').textContent = result.moistureValue;
            document.getElementById('tempValue').textContent = result.tempValue;
            
            // Update recommendations with animation
            const recList = document.getElementById('recommendationsList');
            recList.innerHTML = '';
            result.soilData.recommendations.forEach((rec, index) => {
                setTimeout(() => {
                    const item = document.createElement('div');
                    item.className = 'recommendation-item animate-slideInLeft';
                    item.innerHTML = `
                        <i class="fas ${rec.icon}"></i>
                        <span>${rec.text}</span>
                    `;
                    recList.appendChild(item);
                }, index * 100);
            });
            
            // Update suitable plants with animation
            const plantsList = document.getElementById('suitablePlantsList');
            plantsList.innerHTML = '';
            result.soilData.suitablePlants.forEach((plant, index) => {
                setTimeout(() => {
                    const plantCard = document.createElement('div');
                    plantCard.className = 'plant-card animate-slideInUp';
                    plantCard.innerHTML = `
                        <div class="plant-icon">${plant.icon}</div>
                        <div class="plant-name">${plant.name}</div>
                        <div class="plant-type">${plant.type}</div>
                    `;
                    plantsList.appendChild(plantCard);
                }, index * 50);
            });
            
            // Store current result
            window.currentResult = result;
        }
        
        // ============================================
        // Camera Functions
        // ============================================
        async function openCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: currentCamera } 
                });
                cameraStream = stream;
                document.getElementById('cameraVideo').srcObject = stream;
                document.getElementById('cameraModal').style.display = 'block';
            } catch (error) {
                showMessage('ไม่สามารถเปิดกล้องได้', 'error');
            }
        }
        
        function switchCamera() {
            currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            openCamera();
        }
        
        function capturePhoto() {
            const video = document.getElementById('cameraVideo');
            const canvas = document.getElementById('cameraCanvas');
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
                const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
                handleSingleFile(file);
                closeCamera();
            }, 'image/jpeg', 0.9);
        }
        
        function closeCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            document.getElementById('cameraModal').style.display = 'none';
        }
        
        // ============================================
        // History Management
        // ============================================
        function saveToHistory() {
            if (!window.currentResult) {
                showMessage('ไม่มีผลการวิเคราะห์', 'error');
                return;
            }
            
            // Create compressed version for history
            const compressedResult = {
                ...window.currentResult,
                imageData: null, // Don't save image in history
                timestamp: window.currentResult.timestamp || new Date()
            };
            
            analysisHistory.push(compressedResult);
            
            // Keep only last 20 records
            if (analysisHistory.length > 20) {
                analysisHistory = analysisHistory.slice(-20);
            }
            
            saveHistoryToStorage();
            updateHistoryView();
            
            showToast('บันทึกผลการวิเคราะห์แล้ว', 'success');
        }
        
        function saveHistoryToStorage() {
            try {
                localStorage.setItem('soilAnalysisHistory', JSON.stringify(analysisHistory));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    showMessage('พื้นที่เก็บข้อมูลเต็ม กรุณาล้างประวัติเก่า', 'error');
                    clearOldData();
                }
            }
        }
        
        function loadHistory() {
            try {
                const saved = localStorage.getItem('soilAnalysisHistory');
                if (saved) {
                    analysisHistory = JSON.parse(saved);
                    updateHistoryView();
                }
            } catch (e) {
                console.error('Error loading history:', e);
                analysisHistory = [];
            }
        }
        
        function updateHistoryView() {
            const container = document.getElementById('historyContent');
            
            if (analysisHistory.length === 0) {
                container.innerHTML = '<p class="text-center" style="color: var(--text-light);">ยังไม่มีประวัติการวิเคราะห์</p>';
                return;
            }
            
            let html = '<div style="overflow-x: auto;"><table class="history-table"><thead><tr>';
            html += '<th>วันที่/เวลา</th><th>ประเภทดิน</th><th>pH</th><th>ความชื้น</th><th>อุณหภูมิ</th><th>ความมั่นใจ</th><th>การดำเนินการ</th>';
            html += '</tr></thead><tbody>';
            
            analysisHistory.slice().reverse().forEach((item, index) => {
                const date = new Date(item.timestamp);
                const icon = `<i class="fas ${item.soilData.icon}" style="color: ${item.soilData.color};"></i>`;
                html += `<tr>
                    <td>${date.toLocaleString('th-TH')}</td>
                    <td>${icon} ${item.soilData.name}</td>
                    <td>${item.phValue || '-'}</td>
                    <td>${item.moistureValue || '-'}</td>
                    <td>${item.tempValue ? item.tempValue + '°C' : '-'}</td>
                    <td>${(item.confidence * 100).toFixed(1)}%</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewHistoryItem(${analysisHistory.length - 1 - index})" style="padding: 5px 15px; font-size: 0.9rem;">
                            <i class="fas fa-eye"></i> ดู
                        </button>
                    </td>
                </tr>`;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        
        function viewHistoryItem(index) {
            const item = analysisHistory[index];
            displayResults(item);
            
            // Scroll to results
            document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
            
            showToast('กำลังแสดงผลจากประวัติ', 'info');
        }
        
        function clearHistory() {
            if (confirm('ต้องการล้างประวัติทั้งหมดหรือไม่?')) {
                analysisHistory = [];
                saveHistoryToStorage();
                updateHistoryView();
                showToast('ล้างประวัติแล้ว', 'success');
            }
        }
        
        // ============================================
        // Export Functions
        // ============================================
        function exportToPDF() {
            if (!window.currentResult) {
                showMessage('ไม่มีผลการวิเคราะห์', 'error');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add custom font for Thai
            doc.addFont('https://fonts.googleapis.com/css2?family=Prompt', 'Prompt', 'normal');
            
            // Header
            doc.setFontSize(24);
            doc.setTextColor(16, 185, 129);
            doc.text('SoilAI Pro - รายงานการวิเคราะห์ดิน', 105, 20, { align: 'center' });
            
            // Date
            doc.setFontSize(12);
            doc.setTextColor(55, 65, 81);
            doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH')}`, 20, 40);
            doc.text(`เวลา: ${new Date().toLocaleTimeString('th-TH')}`, 20, 50);
            
            // Divider
            doc.setDrawColor(229, 231, 235);
            doc.line(20, 60, 190, 60);
            
            // Results
            doc.setFontSize(16);
            doc.setTextColor(16, 185, 129);
            doc.text('ผลการวิเคราะห์', 20, 75);
            
            doc.setFontSize(14);
            doc.setTextColor(55, 65, 81);
            doc.text(`ประเภทดิน: ${window.currentResult.soilData.name} (${window.currentResult.soilData.nameEn})`, 20, 90);
            doc.text(`ความมั่นใจ: ${(window.currentResult.confidence * 100).toFixed(1)}%`, 20, 100);
            doc.text(`ค่า pH: ${window.currentResult.phValue}`, 20, 110);
            doc.text(`ความชื้น: ${window.currentResult.moistureValue}`, 20, 120);
            doc.text(`อุณหภูมิที่เหมาะสม: ${window.currentResult.tempValue}°C`, 20, 130);
            
            // Recommendations
            doc.setFontSize(16);
            doc.setTextColor(16, 185, 129);
            doc.text('คำแนะนำการดูแลดิน', 20, 150);
            
            let yPos = 165;
            doc.setFontSize(12);
            doc.setTextColor(55, 65, 81);
            window.currentResult.soilData.recommendations.forEach((rec, index) => {
                const text = `${index + 1}. ${rec.text}`;
                const lines = doc.splitTextToSize(text, 170);
                lines.forEach(line => {
                    doc.text(line, 25, yPos);
                    yPos += 7;
                });
                yPos += 3;
            });
            
            // Suitable plants
            if (yPos < 250) {
                doc.setFontSize(16);
                doc.setTextColor(16, 185, 129);
                doc.text('พืชที่เหมาะสม', 20, yPos + 15);
                
                yPos += 30;
                doc.setFontSize(12);
                doc.setTextColor(55, 65, 81);
                const plants = window.currentResult.soilData.suitablePlants.map(p => p.name).join(', ');
                const plantLines = doc.splitTextToSize(plants, 170);
                plantLines.forEach(line => {
                    doc.text(line, 25, yPos);
                    yPos += 7;
                });
            }
            
            // Footer
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.text('Generated by SoilAI Pro - www.soilai.com', 105, 280, { align: 'center' });
            
            // Save
            doc.save(`soil-analysis-${Date.now()}.pdf`);
            showToast('ดาวน์โหลด PDF แล้ว', 'success');
        }
        
        function exportHistory(format) {
            if (analysisHistory.length === 0) {
                showMessage('ไม่มีประวัติการวิเคราะห์', 'error');
                return;
            }
            
            if (format === 'csv') {
                let csv = 'วันที่,เวลา,ประเภทดิน,pH,ความชื้น,อุณหภูมิ (°C),ความมั่นใจ (%),พืชที่เหมาะสม\n';
                
                analysisHistory.forEach(item => {
                    const date = new Date(item.timestamp);
                    const plants = item.soilData.suitablePlants ? 
                        item.soilData.suitablePlants.map(p => p.name).slice(0, 5).join(' / ') : '';
                    
                    csv += `${date.toLocaleDateString('th-TH')},`;
                    csv += `${date.toLocaleTimeString('th-TH')},`;
                    csv += `${item.soilData.name},`;
                    csv += `${item.phValue || '-'},`;
                    csv += `${item.moistureValue || '-'},`;
                    csv += `${item.tempValue || '-'},`;
                    csv += `${(item.confidence * 100).toFixed(1)},`;
                    csv += `"${plants}"\n`;
                });
                
                // Download CSV
                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `soil-analysis-history-${Date.now()}.csv`;
                link.click();
                
                showToast('ดาวน์โหลด CSV แล้ว', 'success');
                
            } else if (format === 'json') {
                const data = analysisHistory.map(item => ({
                    date: item.timestamp,
                    soilType: item.soilData.name,
                    soilTypeEn: item.soilData.nameEn,
                    confidence: (item.confidence * 100).toFixed(1) + '%',
                    ph: item.phValue,
                    moisture: item.moistureValue,
                    temperature: item.tempValue,
                    recommendations: item.soilData.recommendations.map(r => r.text),
                    suitablePlants: item.soilData.suitablePlants.map(p => p.name)
                }));
                
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `soil-analysis-history-${Date.now()}.json`;
                link.click();
                
                showToast('ดาวน์โหลด JSON แล้ว', 'success');
            }
        }
        
        function shareResult() {
            if (!window.currentResult) {
                showMessage('ไม่มีผลการวิเคราะห์', 'error');
                return;
            }
            
            const plants = window.currentResult.soilData.suitablePlants
                .slice(0, 5)
                .map(p => p.name)
                .join(', ');
            const text = `ผลวิเคราะห์ดิน SoilAI Pro:\n\nประเภทดิน: ${window.currentResult.soilData.name}\nความมั่นใจ: ${(window.currentResult.confidence * 100).toFixed(1)}%\npH: ${window.currentResult.phValue}\nความชื้น: ${window.currentResult.moistureValue}\nอุณหภูมิ: ${window.currentResult.tempValue}°C\n\nพืชที่เหมาะสม: ${plants}`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'ผลวิเคราะห์ดิน - SoilAI Pro',
                    text: text,
                    url: window.location.href
                }).then(() => {
                    showToast('แชร์สำเร็จ', 'success');
                }).catch(err => {
                    console.log('Share cancelled');
                });
            } else {
                // Copy to clipboard
                navigator.clipboard.writeText(text).then(() => {
                    showToast('คัดลอกผลลัพธ์แล้ว', 'success');
                }).catch(() => {
                    showMessage('ไม่สามารถคัดลอกได้', 'error');
                });
            }
        }
        
        // ============================================
        // Theme Management
        // ============================================
        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            
            // Update icon with animation
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.style.transform = 'rotate(180deg)';
                setTimeout(() => {
                    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                    icon.style.transform = 'rotate(0deg)';
                }, 150);
            }
        }
        
        function checkTheme() {
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark-mode');
                const icon = document.getElementById('themeIcon');
                if (icon) {
                    icon.className = 'fas fa-sun';
                }
            }
        }
        
        // ============================================
        // Other Utility Functions
        // ============================================
        function resetUpload() {
            const imageInput = document.getElementById('imageInput');
            const previewContainer = document.getElementById('previewContainer');
            const analyzeBtn = document.getElementById('analyzeBtn');
            const resultDisplay = document.getElementById('resultDisplay');
            const emptyResult = document.getElementById('emptyResult');
            
            if (imageInput) imageInput.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (analyzeBtn) analyzeBtn.style.display = 'none';
            if (resultDisplay) resultDisplay.style.display = 'none';
            if (emptyResult) emptyResult.style.display = 'block';
            
            hideMessage();
            showToast('รีเซ็ตแล้ว', 'info');
        }
        
        // ============================================
        // Performance Optimizations
        // ============================================
        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe elements with animations
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.feature-card, .stat-card').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'all 0.6s ease-out';
                observer.observe(el);
            });
        });
        
        // ============================================
        // Keyboard Shortcuts
        // ============================================
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + O = Open file
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('imageInput').click();
            }
            
            // Ctrl/Cmd + S = Save to history
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveToHistory();
            }
            
            // Ctrl/Cmd + E = Export PDF
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                exportToPDF();
            }
            
            // Ctrl/Cmd + D = Toggle dark mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                toggleTheme();
            }
        });
        
        
        // ============================================
        // Recent Analyses Management with Size Limit
        // ============================================
        function saveToRecent(result) {
            try {
                // Get recent analyses from localStorage
                let recentAnalyses = JSON.parse(localStorage.getItem('recentAnalyses') || '[]');
                
                // Create a lighter version of result (without full image)
                const lightResult = {
                    ...result,
                    imageData: result.imageData ? result.imageData.substring(0, 100) + '...' : null,
                    thumbnail: result.imageData ? result.imageData : null
                };
                
                // Add new result to beginning
                recentAnalyses.unshift(lightResult);
                
                // Keep only last 3 (reduced from 5)
                recentAnalyses = recentAnalyses.slice(0, 3);
                
                // Save back to localStorage
                localStorage.setItem('recentAnalyses', JSON.stringify(recentAnalyses));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('Storage quota exceeded, clearing old data...');
                    clearOldData();
                }
            }
        }
        
        // AI Chatbot Script
(function() {
    const CHATBOT_API_URL = 'https://aichatbotfarmer-2.onrender.com/chat';
    let isTyping = false;
    
    // Initialize chatbot
    function initChatbot() {
        const chatbotButton = document.getElementById('chatbotButton');
        const chatbotPopup = document.getElementById('chatbotPopup');
        const chatbotClose = document.getElementById('chatbotClose');
        const chatbotInput = document.getElementById('chatbotInput');
        const chatbotSend = document.getElementById('chatbotSend');
        
        // Toggle chatbot
        chatbotButton.addEventListener('click', () => {
            chatbotPopup.classList.toggle('active');
            if (chatbotPopup.classList.contains('active')) {
                chatbotInput.focus();
                
                // Show welcome message if first time
                const messages = document.getElementById('chatbotMessages');
                if (messages.children.length === 0) {
                    addChatMessage('สวัสดีครับ! 👋 ผมคือ AI ผู้ช่วยด้านการเกษตร ยินดีให้คำปรึกษาเกี่ยวกับการปลูกพืช การดูแลดิน โรคพืช และเรื่องอื่นๆ ทางการเกษตรครับ', 'bot');
                    showQuickActions();
                }
            }
        });
        
        // Close chatbot
        chatbotClose.addEventListener('click', () => {
            chatbotPopup.classList.remove('active');
        });
        
        // Send message on enter
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        
        // Send button click
        chatbotSend.addEventListener('click', sendChatMessage);
        
        // Show notification after delay
        setTimeout(() => {
            const notification = document.querySelector('.chatbot-notification');
            notification.style.display = 'block';
        }, 5000);
    }
    
    // Show/hide quick actions
    function showQuickActions() {
        const quickActions = document.getElementById('quickActions');
        quickActions.classList.add('show');
    }
    
    function hideQuickActions() {
        const quickActions = document.getElementById('quickActions');
        quickActions.classList.remove('show');
    }
    
    // Send quick message
    window.sendQuickMessage = function(message) {
        const input = document.getElementById('chatbotInput');
        input.value = message;
        sendChatMessage();
    }
    
    // Add message to chat
    function addChatMessage(message, sender) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble';
        bubble.textContent = message;
        
        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Send chat message
    async function sendChatMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (!message || isTyping) return;
        
        // Add user message
        addChatMessage(message, 'user');
        
        // Clear input and hide quick actions
        input.value = '';
        hideQuickActions();
        
        // Show typing indicator
        showTyping();
        isTyping = true;
        document.getElementById('chatbotSend').disabled = true;
        
        try {
            const response = await fetch(CHATBOT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            // Hide typing indicator
            hideTyping();
            
            if (data.response) {
                addChatMessage(data.response, 'bot');
            } else if (data.error) {
                addChatMessage('ขออภัย เกิดข้อผิดพลาด: ' + data.error, 'bot');
            }
            
        } catch (error) {
            hideTyping();
            addChatMessage('ขออภัย ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง', 'bot');
        } finally {
            isTyping = false;
            document.getElementById('chatbotSend').disabled = false;
            input.focus();
        }
    }
    
    // Show/hide typing indicator
    function showTyping() {
        document.getElementById('chatbotTyping').style.display = 'flex';
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function hideTyping() {
        document.getElementById('chatbotTyping').style.display = 'none';
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
        
        // ============================================
        // Error Handling
        // ============================================
        window.addEventListener('error', (e) => {
            console.error('Global error:', e);
            
            // Don't show error for tensor disposal warnings or backend errors
            if (e.message && (e.message.includes('Tensor is disposed') || 
                             e.message.includes('backend') ||
                             e.message.includes('tf is not defined'))) {
                return;
            }
            
            showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
        });
        
        // Handle offline/online
        window.addEventListener('offline', () => {
            showToast('ไม่มีการเชื่อมต่ออินเทอร์เน็ต', 'error');
        });
        
        window.addEventListener('online', () => {
            showToast('กลับมาออนไลน์แล้ว', 'success');
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            // Dispose of TensorFlow resources
            if (model && model.dispose) {
                model.dispose();
            }
            
            // Stop camera stream if active
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            
        });