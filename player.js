<script>
const video = document.getElementById('video'), player = document.getElementById('player');
const videoPreview = document.getElementById('videoPreview'), thumbPreview = document.getElementById('thumbPreview');
const thumbTime = document.getElementById('thumbTime'), progressCurrent = document.getElementById('progressCurrent');
const container = document.getElementById('progressContainer'), timeDisplay = document.getElementById('timeDisplay');
const settingsMenu = document.getElementById('settingsMenu'), flashEffect = document.getElementById('flashEffect');
const volumeSlider = document.getElementById('volumeSlider'), muteBtn = document.getElementById('muteBtn');

const dlBtn = document.getElementById('downBtn'), dlModal = document.getElementById('dlModal');
const dlCancel = document.getElementById('dlCancel'), dlConfirm = document.getElementById('dlConfirm');
const fillToggle = document.getElementById('fillToggle');
const zoneLeft = document.getElementById('zoneLeft'), zoneRight = document.getElementById('zoneRight');

const resumeModal = document.getElementById('resumeModal');
const resumeCancel = document.getElementById('resumeCancel');
const resumeConfirm = document.getElementById('resumeConfirm');
const storageKey = "miraculous_prime_progress";

const introOverlay = document.getElementById('introOverlay');
const introVideo = document.getElementById('introVideo');
const startIntroBtn = document.getElementById('startIntro');

// --- LÓGICA DE DETECÇÃO DA IMAGEM DE CAPA ---
(function detectCoverImage() {
    const iterator = document.createNodeIterator(document.body, NodeFilter.SHOW_COMMENT, null, false);
    let node;
    while (node = iterator.nextNode()) {
        if (node.nodeValue.includes('IMAGEM DE CAPA')) {
            // O próximo comentário geralmente contém a div com a imagem
            let nextNode = iterator.nextNode();
            if (nextNode) {
                const match = nextNode.nodeValue.match(/src='(.*?)'/);
                if (match && match[1]) {
                    introOverlay.style.backgroundImage = `url('${match[1]}')`;
                }
            }
            break;
        }
    }
})();

// --- SISTEMA DE INTRODUÇÃO ---
startIntroBtn.onclick = () => {
    introVideo.style.display = 'block'; // Mostra o vídeo da intro
    introVideo.muted = false;
    introVideo.volume = 1.0;
    introVideo.play();
    startIntroBtn.style.opacity = '0';
    startIntroBtn.style.pointerEvents = 'none';
};

introVideo.onended = () => {
    introOverlay.classList.add('fade-out');
    setTimeout(() => {
        introOverlay.style.display = 'none';
    }, 500);
};

videoPreview.src = video.querySelector('source').src;
let isDragging = false, wasPaused = false;
let castInitialized = false;

// --- CORREÇÃO DO SISTEMA DE TRANSMISSÃO ---
function initializeCastPlayer() {
    if (castInitialized) return;
    
    try {
        const castContext = cast.framework.CastContext.getInstance();
        castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });

        const castBtn = document.getElementById('castBtn');
        if (castBtn) {
            castBtn.style.display = 'flex';
            castBtn.onclick = (e) => {
                e.stopPropagation();
                castContext.requestSession().then(() => {
                    const session = castContext.getCurrentSession();
                    const mediaInfo = new chrome.cast.media.MediaInfo(video.querySelector('source').src, 'video/mp4');
                    const request = new chrome.cast.media.LoadRequest(mediaInfo);
                    request.currentTime = video.currentTime;
                    session.loadMedia(request).then(() => video.pause());
                }).catch(err => console.log('Erro Cast:', err));
            };
        }
        castInitialized = true;
    } catch (e) {
        console.error("Erro ao inicializar Cast Framework", e);
    }
}

window.__onGCastApiAvailable = function(isAvailable) {
    if (isAvailable) initializeCastPlayer();
};

const castCheckInterval = setInterval(() => {
    if (window.cast && window.cast.framework) {
        initializeCastPlayer();
        clearInterval(castCheckInterval);
    }
}, 1000);

setTimeout(() => clearInterval(castCheckInterval), 10000);

// --- RESTO DO CÓDIGO ---
video.addEventListener('loadedmetadata', () => {
    const savedTime = localStorage.getItem(storageKey);
    if (savedTime && parseFloat(savedTime) > 5 && parseFloat(savedTime) < video.duration - 5) {
        if (introOverlay.style.display === 'none') {
            resumeModal.classList.add('active');
        } else {
            introVideo.addEventListener('ended', () => {
                 resumeModal.classList.add('active');
            }, {once: true});
        }
    }
});

resumeConfirm.onclick = () => {
    video.currentTime = parseFloat(localStorage.getItem(storageKey));
    resumeModal.classList.remove('active');
    video.play();
};

resumeCancel.onclick = () => {
    localStorage.removeItem(storageKey);
    resumeModal.classList.remove('active');
    video.play();
};

video.addEventListener('timeupdate', () => {
    if (!isDragging && video.currentTime > 0) {
        localStorage.setItem(storageKey, video.currentTime);
    }
});

zoneLeft.ondblclick = () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
    animateZone(zoneLeft);
};
zoneRight.ondblclick = () => {
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
    animateZone(zoneRight);
};
function animateZone(z) {
    z.classList.add('active');
    setTimeout(() => z.classList.remove('active'), 600);
}

fillToggle.onclick = (e) => {
    e.stopPropagation();
    video.classList.toggle('fill-mode');
    fillToggle.style.color = video.classList.contains('fill-mode') ? '#00ffcc' : 'white';
};

dlBtn.onclick = (e) => { e.preventDefault(); dlModal.classList.add('active'); };
dlCancel.onclick = () => dlModal.classList.remove('active');
dlConfirm.onclick = async function() {
    dlModal.classList.remove('active');
    dlBtn.classList.add('loading');
    const url = document.getElementById('videoSource').src;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = "MiraculousPrime_Video.mp4";
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); document.body.removeChild(a); }, 100);
    } catch (err) {
        const a = document.createElement('a'); a.href = url;
        a.setAttribute('download', 'MiraculousPrime_Video.mp4'); a.click();
    } finally { dlBtn.classList.remove('loading'); }
};

document.getElementById('screenshotBtn').onclick = function() {
    const btn = this;
    flashEffect.classList.remove('run-flash'); void flashEffect.offsetWidth; 
    flashEffect.classList.add('run-flash'); btn.classList.add('loading');
    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `MiraculousPrime_Frame_${Math.floor(video.currentTime)}.jpg`;
            a.click(); URL.revokeObjectURL(url); btn.classList.remove('loading');
        }, 'image/jpeg', 0.9);
    } catch (err) { btn.classList.remove('loading'); }
};

function updateScrub(e) {
    const rect = container.getBoundingClientRect();
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    let position = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = position / rect.width;
    const targetTime = percentage * video.duration;
    progressCurrent.style.width = (percentage * 100) + "%";
    thumbPreview.style.display = 'block';
    thumbPreview.style.left = position + 'px';
    thumbTime.textContent = fmt(targetTime);
    videoPreview.currentTime = targetTime;
    if (isDragging) video.currentTime = targetTime;
}

container.addEventListener('mousedown', (e) => { isDragging = true; wasPaused = video.paused; video.pause(); updateScrub(e); });
container.addEventListener('touchstart', (e) => { isDragging = true; updateScrub(e); }, {passive: true});
window.addEventListener('mousemove', (e) => { if (isDragging) updateScrub(e); });
window.addEventListener('touchmove', (e) => { if (isDragging) updateScrub(e); }, {passive: true});
window.addEventListener('mouseup', () => { if (isDragging) { isDragging = false; thumbPreview.style.display = 'none'; if (!wasPaused) video.play(); } });
window.addEventListener('touchend', () => { isDragging = false; thumbPreview.style.display = 'none'; });
container.addEventListener('mousemove', (e) => { if (!isDragging) updateScrub(e); });
container.addEventListener('mouseleave', () => { if (!isDragging) thumbPreview.style.display = 'none'; });

volumeSlider.addEventListener('input', (e) => { video.volume = e.target.value; video.muted = (video.volume === 0); updateVolumeIcon(); });
muteBtn.onclick = (e) => { e.stopPropagation(); video.muted = !video.muted; volumeSlider.value = video.muted ? 0 : video.volume; updateVolumeIcon(); };
function updateVolumeIcon() {
    const icon = document.getElementById('volIcon');
    icon.innerHTML = (video.muted || video.volume === 0) ? 
    '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="white"/>' :
    '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="white"/>';
}

video.addEventListener('timeupdate', () => {
    if (!isDragging) {
        const p = (video.currentTime / video.duration) * 100;
        progressCurrent.style.width = (p || 0) + "%";
        timeDisplay.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    }
});

const togglePlay = () => video.paused ? video.play() : video.pause();
document.getElementById('playBtn').onclick = togglePlay;
document.getElementById('zoneCenter').onclick = togglePlay;
video.onplay = () => { document.getElementById('playIcon').style.display='none'; document.getElementById('pauseIcon').style.display='block'; player.classList.add('playing'); };
video.onpause = () => { document.getElementById('playIcon').style.display='block'; document.getElementById('pauseIcon').style.display='none'; player.classList.remove('playing'); };

document.getElementById('settingsBtn').onclick = (e) => { e.stopPropagation(); settingsMenu.classList.toggle('active'); };
document.getElementById('speedMenu').onclick = (e) => {
    e.stopPropagation();
    const s = [1, 1.25, 1.5, 2, 0.5];
    video.playbackRate = s[(s.indexOf(video.playbackRate) + 1) % s.length];
    document.getElementById('speedVal').textContent = video.playbackRate + 'x';
};
document.getElementById('pipMenu').onclick = (e) => { e.stopPropagation(); video.requestPictureInPicture(); };
document.getElementById('fsBtn').onclick = () => !document.fullscreenElement ? player.requestFullscreen() : document.exitFullscreen();

let hideTimer;
player.onmousemove = () => {
    player.classList.remove('hide'); clearTimeout(hideTimer);
    if(!video.paused) hideTimer = setTimeout(() => { player.classList.add('hide'); settingsMenu.classList.remove('active'); }, 3000);
};

function fmt(s) {
    if(isNaN(s)) return "0:00";
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60).toString().padStart(2,'0');
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec}` : `${m}:${sec}`;
}
document.onclick = () => settingsMenu.classList.remove('active');
</script>
