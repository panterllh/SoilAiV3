/* FILE: script.js */
/* Put this content into file named script.js (same folder as index.html) */

(() => {
  // Short helper to dynamically load JS (returns a Promise)
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // --- Elements ---
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');
  const openFileBtn = document.getElementById('openFileBtn');
  const openCameraBtn = document.getElementById('openCameraBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const previewContainer = document.getElementById('previewContainer');
  const loadingEl = document.getElementById('loading');
  const resultDisplay = document.getElementById('resultDisplay');
  const soilName = document.getElementById('soilName');
  const confidenceText = document.getElementById('confidenceText');
  const phValue = document.getElementById('phValue');
  const moistureValue = document.getElementById('moistureValue');
  const tempValue = document.getElementById('tempValue');
  const recommendations = document.getElementById('recommendations');
  const historyList = document.getElementById('historyList');

  // Chatbot
  const chatbotToggle = document.getElementById('chatbotToggle');
  const chatbotPanel = document.getElementById('chatbotPanel');
  const closeChatbot = document.getElementById('closeChatbot');
  const chatSend = document.getElementById('chatSend');
  const chatInput = document.getElementById('chatInput');
  const chatbotBody = document.getElementById('chatbotBody');

  // State
  let currentImageData = null; // data URL

  // --- Init ---
  function init() {
    bindUI();
    loadHistory();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeChatbotPanel(); });
    // hide loading initially
    loadingEl.style.display = 'none';
  }

  function bindUI(){
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', e => { uploadArea.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });

    imageInput.addEventListener('change', e => handleFiles(e.target.files));
    openFileBtn.addEventListener('click', () => imageInput.click());
    openCameraBtn.addEventListener('click', openCamera);
    analyzeBtn.addEventListener('click', analyzeImage);
    resetBtn.addEventListener('click', resetUpload);
    exportPdfBtn.addEventListener('click', exportPdf);

    // chatbot
    chatbotToggle.addEventListener('click', toggleChatbot);
    closeChatbot.addEventListener('click', closeChatbotPanel);
    chatSend.addEventListener('click', sendChat);

    // small UX: enable analyze on image loaded
  }

  function handleFiles(files){
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith('image/')) return alert('ไฟล์ไม่ใช่รูป');
    if (f.size > 10 * 1024 * 1024) return alert('ไฟล์เกิน 10MB');

    const reader = new FileReader();
    reader.onload = e => {
      currentImageData = e.target.result;
      renderPreview(currentImageData);
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(f);
  }

  function renderPreview(dataUrl){
    previewContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Preview image';
    previewContainer.appendChild(img);
  }

  // Camera capture (simple): open in new modal using getUserMedia
  async function openCamera(){
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.autoplay = true; video.playsInline = true; video.srcObject = stream; video.style.width = '100%';
      const modal = document.createElement('div');
      modal.className = 'modal'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
      const box = document.createElement('div'); box.style.width='90%'; box.style.maxWidth='480px'; box.style.background='#fff'; box.style.padding='12px'; box.style.borderRadius='10px';
      const btnCapture = document.createElement('button'); btnCapture.textContent='ถ่ายรูป'; btnCapture.className='btn primary';
      const btnClose = document.createElement('button'); btnClose.textContent='ยกเลิก'; btnClose.className='btn';
      box.appendChild(video); box.appendChild(btnCapture); box.appendChild(btnClose); modal.appendChild(box); document.body.appendChild(modal);

      btnCapture.onclick = () => {
        const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; const ctx = c.getContext('2d'); ctx.drawImage(video,0,0,c.width,c.height);
        const dataUrl = c.toDataURL('image/jpeg', 0.9);
        currentImageData = dataUrl; renderPreview(dataUrl); analyzeBtn.disabled = false;
        // stop stream
        stream.getTracks().forEach(t => t.stop()); document.body.removeChild(modal);
      };
      btnClose.onclick = () => { stream.getTracks().forEach(t => t.stop()); document.body.removeChild(modal); };
    } catch (err) {
      alert('ไม่สามารถเข้าถึงกล้อง: ' + err.message);
    }
  }

  // Load TF.js dynamically only when needed
  let tfLoaded = false;
  async function ensureTf(){
    if (tfLoaded) return;
    try {
      loadingEl.style.display='block'; loadingEl.setAttribute('aria-hidden','false');
      // load a specific stable version
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.20.0/dist/tf.min.js');
      tfLoaded = true;
    } catch(e){
      console.warn('ไม่สามารถโหลด TensorFlow.js:', e);
      // we'll still provide a fallback simulated analyze
    } finally{
      loadingEl.style.display='none'; loadingEl.setAttribute('aria-hidden','true');
    }
  }

  // Analyze Image — try to use a model if available, otherwise simulate
  async function analyzeImage(){
    if (!currentImageData) return alert('ยังไม่มีรูปให้วิเคราะห์');

    // Show loading
    loadingEl.style.display='block'; loadingEl.setAttribute('aria-hidden','false');
    resultDisplay.style.display='none';

    // load tf if available (non-blocking if fails)
    await ensureTf();

    try {
      // TODO: replace this section to load your real model (e.g. model/model.json)
      let result = null;
      if (window.tf && false) {
        // example: const model = await tf.loadLayersModel('/model/model.json');
        // const tensor = preprocess(currentImageData) ... predict
      }

      // fallback simulated result (for demo) — replace with real model outputs
      result = simulatedResult();

      renderResult(result);
      saveToHistory({ image: currentImageData, result, time: new Date().toISOString() });

    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดขณะวิเคราะห์');
    } finally {
      loadingEl.style.display='none'; loadingEl.setAttribute('aria-hidden','true');
    }
  }

  function simulatedResult(){
    // pick a soil type randomly for demo
    const soilTypes = [
      {name:'ดินร่วน', ph:6.5, moisture:'ปานกลาง', temp:28, conf:Math.round(70+Math.random()*25)},
      {name:'ดินเหนียว', ph:5.8, moisture:'ชื้น', temp:26, conf:Math.round(60+Math.random()*30)},
      {name:'ดินทราย', ph:7.1, moisture:'แห้ง', temp:30, conf:Math.round(55+Math.random()*35)}
    ];
    return soilTypes[Math.floor(Math.random()*soilTypes.length)];
  }

  function renderResult(res){
    soilName.textContent = res.name;
    confidenceText.textContent = res.conf + '%';
    phValue.textContent = res.ph;
    moistureValue.textContent = res.moisture;
    tempValue.textContent = res.temp + ' °C';

    // simple recommendations based on soil type
    const recs = generateRecommendations(res);
    recommendations.innerHTML = '';
    recs.forEach(r => {
      const p = document.createElement('p'); p.textContent = '• ' + r; recommendations.appendChild(p);
    });

    resultDisplay.style.display = 'block';
  }

  function generateRecommendations(res){
    if (res.name === 'ดินร่วน') return ['ปลูกผักสวนครัวได้ดี', 'ใส่ปุ๋ยคอกบางครั้งเพื่อรักษาความชื้น'];
    if (res.name === 'ดินเหนียว') return ['เพิ่มทรายและปุ๋ยหมักเพื่อปรับโครงสร้าง', 'ระบายน้ำดีเพื่อป้องกันรากเน่า'];
    if (res.name === 'ดินทราย') return ['เพิ่มการเก็บความชื้นโดยคลุมดิน', 'เติมปุ๋ยคอกและอินทรียวัตถุ'];
    return ['แนะนำการดูแลทั่วไป: เติมอินทรียวัตถุ ปรับ pH ถ้าจำเป็น'];
  }

  // Local storage history
  const HISTORY_KEY = 'soilai_history_v1';
  function saveToHistory(entry){
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    arr.unshift(entry); if (arr.length > 50) arr.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    loadHistory();
  }

  function loadHistory(){
    historyList.innerHTML = '';
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    arr.forEach((h, idx) => {
      const div = document.createElement('div'); div.className='history-item';
      const img = document.createElement('img'); img.src = h.image; img.style.width='64px'; img.style.height='48px'; img.style.objectFit='cover'; img.alt='history-'+idx;
      const info = document.createElement('div'); info.style.flex='1';
      const t = document.createElement('div'); t.textContent = new Date(h.time).toLocaleString();
      const s = document.createElement('div'); s.textContent = h.result.name + ' (' + h.result.conf + '%)';
      info.appendChild(t); info.appendChild(s);
      const btnView = document.createElement('button'); btnView.textContent='ดู'; btnView.className='btn'; btnView.onclick = () => { currentImageData = h.image; renderPreview(h.image); renderResult(h.result); };
      div.appendChild(img); div.appendChild(info); div.appendChild(btnView);
      historyList.appendChild(div);
    });
  }

  function resetUpload(){
    currentImageData = null; previewContainer.innerHTML = ''; analyzeBtn.disabled = true; resultDisplay.style.display='none';
  }

  // PDF export using jsPDF
  function exportPdf(){
    if (!currentImageData) return alert('ไม่มีผลให้ดาวน์โหลด');
    // create a PDF with image and result
    const { jsPDF } = window.jspdf || {}; if (!jsPDF) return alert('jsPDF ยังโหลดไม่เสร็จ โปรดรอสักครู่แล้วลองใหม่');
    const doc = new jsPDF({unit:'px', format:'a4'});
    doc.setFontSize(18); doc.text('SoilAI Pro — รายงานผลการวิเคราะห์', 40, 40);
    // image
    doc.addImage(currentImageData, 'JPEG', 40, 70, 260, 180);
    doc.setFontSize(12);
    doc.text(`ประเภทดิน: ${soilName.textContent}`, 320, 90);
    doc.text(`ความมั่นใจ: ${confidenceText.textContent}`, 320, 110);
    doc.text(`pH: ${phValue.textContent}`, 320, 130);
    doc.text(`ความชื้น: ${moistureValue.textContent}`, 320, 150);
    doc.text(`อุณหภูมิ: ${tempValue.textContent}`, 320, 170);
    const recLines = Array.from(recommendations.querySelectorAll('p')).map(p => p.textContent.replace(/^•\s*/, ''));
    doc.text('คำแนะนำ:', 40, 270);
    doc.setFontSize(11);
    recLines.forEach((r, i) => doc.text(`${i+1}. ${r}`, 40, 290 + i*16));
    doc.save('soilai-report.pdf');
  }

  // --- Chatbot (local canned responses) ---
  function toggleChatbot(){
    const open = chatbotPanel.style.display !== 'flex';
    chatbotPanel.style.display = open ? 'flex' : 'none';
    chatbotPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) chatbotBody.innerHTML = '<div>สวัสดี! ผมช่วยแนะนำการปลูกพืชทั่วไปได้ ลองพิมพ์คำถาม เช่น "จุดที่ดินแฉะ" หรือเลือกคำถามเร็วด้านล่าง.</div>';
  }
  function closeChatbotPanel(){ chatbotPanel.style.display='none'; chatbotPanel.setAttribute('aria-hidden','true'); }
  function sendChat(){
    const v = chatInput.value.trim(); if (!v) return;
    addChatMessage('user', v); chatInput.value='';
    setTimeout(()=>{
      // simple keyword responses
      const resp = cannedResponse(v);
      addChatMessage('bot', resp);
    }, 400);
  }
  function addChatMessage(who, text){
    const div = document.createElement('div'); div.className = 'chat-msg ' + who; div.textContent = text; chatbotBody.appendChild(div); chatbotBody.scrollTop = chatbotBody.scrollHeight;
  }
  function cannedResponse(q){
    q = q.toLowerCase();
    if (q.includes('แฉะ') || q.includes('น้ำ')) return 'ถ้าดินแฉะ แนะนำให้ปรับระบบระบายน้ำและใส่วัสดุกลบเพื่อเพิ่มการซึม';
    if (q.includes('ph') || q.includes('กรด')) return 'ถ้าค่า pH ต่ำกว่า 6.0 อาจใส่ปูนขาวเพื่อปรับ pH ขึ้น';
    if (q.includes('ปุ๋ย')) return 'ใช้ปุ๋ยคอกหรือปุ๋ยหมักร่วมกับปุ๋ยสูตรสมดุลตามชนิดพืช';
    return 'ขอโทษ ผมยังตอบอันนี้ไม่ได้อย่างละเอียด แต่แนะนำให้ส่งรูปหรือระบุปัญหาให้ชัดขึ้นครับ';
  }

  // --- Init app ---
  document.addEventListener('DOMContentLoaded', init);
})();
