/**
 * PADA AKHIRNYA, BUKAN AKU — DIGITAL INTERACTIVE BOOK EXPERIENCE
 * Complete Engine: 3D Page Flip, Web Audio Synthesizer, Touch Gestures,
 * Bookmark Manager, Table of Contents, and Ambient Canvas.
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const state = {
    isOpen: false,
    currentSheetIndex: 0,
    totalSheets: 12,
    totalPages: 24,
    mobileActivePage: 1, // 1 to 24 for mobile 1-page view
    isMobile: window.innerWidth <= 768,
    isFlipping: false,
    soundSfxEnabled: true,
    musicPlaying: false,
    theme: 'midnight', // 'midnight' or 'candle'
    touchStartX: 0,
    touchStartY: 0
  };

  // Chapter labels per spread/page
  const chapterTitles = {
    0: 'Prakata & Daftar Isi',
    1: 'Bab 1 — Awal yang Tidak Direncanakan',
    2: 'Bab 2 — Aku Mulai Berharap',
    3: 'Surat I & Kutipan Renungan',
    4: 'Bab 3 — Hal-Hal Kecil yang Kusalahartikan',
    5: 'Bab 4 — Ada Nama Lain di Hatimu',
    6: 'Bab 5 — Ternyata Bukan Aku',
    7: 'Surat II & Kenyataan Pahit',
    8: 'Bab 6 — Aku Melihatmu Bahagia Dengannya',
    9: 'Bab 7 — Berhenti Menunggu',
    10: 'Bab 8 — Pada Akhirnya, Aku Melepaskanmu',
    11: 'Halaman Terakhir & Epilog'
  };

  // DOM Elements
  const coverScene = document.getElementById('coverScene');
  const readerScene = document.getElementById('readerScene');
  const bookSpread = document.getElementById('bookSpread');
  const sheets = Array.from(document.querySelectorAll('.sheet'));
  const btnOpenBook = document.getElementById('btnOpenBook');
  const btnResumeBook = document.getElementById('btnResumeBook');
  const resumePageNumEl = document.getElementById('resumePageNum');
  const coverBook3d = document.getElementById('coverBook3d');

  // Navigation & Controls
  const navPrevBtn = document.getElementById('navPrevBtn');
  const navNextBtn = document.getElementById('navNextBtn');
  const btnHome = document.getElementById('btnHome');
  const btnToc = document.getElementById('btnToc');
  const btnBookmark = document.getElementById('btnBookmark');
  const btnSoundSfx = document.getElementById('btnSoundSfx');
  const btnMusic = document.getElementById('btnMusic');
  const btnTheme = document.getElementById('btnTheme');
  const themeLabel = document.getElementById('themeLabel');
  const chapterIndicator = document.getElementById('chapterIndicator');
  const pageIndicatorText = document.getElementById('pageIndicatorText');
  const progressFill = document.getElementById('progressFill');
  const toastNotice = document.getElementById('toastNotice');
  const bookRibbon = document.getElementById('bookRibbon');

  // TOC Elements
  const tocDrawer = document.getElementById('tocDrawer');
  const tocCloseBtn = document.getElementById('tocCloseBtn');
  const tocBackdrop = document.getElementById('tocBackdrop');
  const tocJumpLinks = document.querySelectorAll('.toc-jump-link');
  const tocPageList = document.querySelectorAll('.toc-page-list li');

  // Back cover actions
  const btnReadAgain = document.getElementById('btnReadAgain');
  const btnShareQuote = document.getElementById('btnShareQuote');

  // =========================================================================
  // TOAST NOTIFICATION HELPER
  // =========================================================================
  let toastTimer = null;
  function showToast(message, duration = 3000) {
    if (toastTimer) clearTimeout(toastTimer);
    toastNotice.textContent = message;
    toastNotice.classList.add('show');
    toastTimer = setTimeout(() => {
      toastNotice.classList.remove('show');
    }, duration);
  }

  // =========================================================================
  // LOCAL STORAGE & BOOKMARK
  // =========================================================================
  const STORAGE_KEY = 'buku_bukan_aku_bookmark';

  function initBookmark() {
    const savedPage = localStorage.getItem(STORAGE_KEY);
    if (savedPage) {
      const pageNum = parseInt(savedPage, 10);
      if (pageNum >= 1 && pageNum <= state.totalPages) {
        btnResumeBook.classList.remove('hidden');
        resumePageNumEl.textContent = pageNum;
      }
    }
  }

  function saveBookmark(pageNum) {
    localStorage.setItem(STORAGE_KEY, pageNum);
    btnResumeBook.classList.remove('hidden');
    resumePageNumEl.textContent = pageNum;
    showToast(`Halaman ${pageNum} berhasil disimpan!`);
  }

  btnBookmark.addEventListener('click', () => {
    let currentPageNum = 1;
    if (state.isMobile) {
      currentPageNum = state.mobileActivePage;
    } else {
      currentPageNum = state.currentSheetIndex * 2 + 1;
    }
    saveBookmark(currentPageNum);
  });

  // =========================================================================
  // LOCAL AUDIO INTEGRATION (Source: musik/ folder)
  // =========================================================================
  let bgMusic = document.getElementById('bgMusic');
  if (!bgMusic) {
    bgMusic = new Audio('musik/lagu.mp3');
    bgMusic.id = 'bgMusic';
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
    document.body.appendChild(bgMusic);
  }

  bgMusic.volume = 0.65;

  bgMusic.addEventListener('play', () => {
    state.musicPlaying = true;
    btnMusic.classList.add('btn-playing', 'active');
    const musicStatusText = document.getElementById('musicStatusText');
    if (musicStatusText) musicStatusText.textContent = 'Musik: Aktif';
  });

  bgMusic.addEventListener('pause', () => {
    state.musicPlaying = false;
    btnMusic.classList.remove('btn-playing', 'active');
    const musicStatusText = document.getElementById('musicStatusText');
    if (musicStatusText) musicStatusText.textContent = 'Musik: Mati';
  });

  bgMusic.addEventListener('ended', () => {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
  });

  // Realistic Paper Turning SFX (Web Audio API filtered noise burst)
  let audioCtx = null;
  function initAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPaperTurnSound() {
    if (!state.soundSfxEnabled) return;
    try {
      initAudioContext();
      if (!audioCtx) return;
      const bufferSize = audioCtx.sampleRate * 0.16; // 160ms burst
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1200, audioCtx.currentTime);
      bandpass.frequency.exponentialRampToValueAtTime(450, audioCtx.currentTime + 0.15);
      bandpass.Q.value = 1.8;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
    } catch (e) {
      console.warn('Paper audio notification', e);
    }
  }

  function toggleMusic() {
    initAudioContext();
    if (!bgMusic) {
      bgMusic = new Audio('musik/lagu.mp3');
      bgMusic.loop = true;
    }

    if (bgMusic.paused) {
      bgMusic.play().then(() => {
        showToast('Memutar musik dari folder musik');
      }).catch((err) => {
        console.warn('Playback error:', err);
        showToast('Klik layar untuk mengizinkan audio');
      });
    } else {
      bgMusic.pause();
      showToast('Musik dinonaktifkan.');
    }
  }

  btnMusic.addEventListener('click', toggleMusic);

  // Toggle Paper SFX
  btnSoundSfx.addEventListener('click', () => {
    state.soundSfxEnabled = !state.soundSfxEnabled;
    btnSoundSfx.classList.toggle('active', state.soundSfxEnabled);
    showToast(state.soundSfxEnabled ? 'Efek suara kertas aktif' : 'Efek suara kertas nonaktif');
  });

  // =========================================================================
  // THEME SWITCHING (MIDNIGHT / CANDLE)
  // =========================================================================
  btnTheme.addEventListener('click', () => {
    if (state.theme === 'midnight') {
      state.theme = 'candle';
      document.body.classList.remove('mode-midnight');
      document.body.classList.add('mode-candle');
      themeLabel.textContent = 'Malam';
      showToast('Suasana Lilin Hangat diaktifkan');
    } else {
      state.theme = 'midnight';
      document.body.classList.remove('mode-candle');
      document.body.classList.add('mode-midnight');
      themeLabel.textContent = 'Lilin';
      showToast('Suasana Malam Sunyi diaktifkan');
    }
  });

  // =========================================================================
  // BOOK NAVIGATION & PAGE FLIPPING LOGIC
  // =========================================================================

  function updateHUD() {
    // Current chapter text
    const chTitle = chapterTitles[state.currentSheetIndex] || 'Pada Akhirnya, Bukan Aku';
    chapterIndicator.textContent = chTitle;

    // Progress bar and page indicator text
    let leftPageNum, rightPageNum, progressPercent;

    if (state.isMobile) {
      const cur = state.mobileActivePage;
      pageIndicatorText.textContent = `Halaman ${cur} dari ${state.totalPages}`;
      progressPercent = (cur / state.totalPages) * 100;
    } else {
      leftPageNum = state.currentSheetIndex * 2 + 1;
      rightPageNum = Math.min(leftPageNum + 1, state.totalPages);
      pageIndicatorText.textContent = `Halaman ${leftPageNum} – ${rightPageNum} dari ${state.totalPages}`;
      progressPercent = (rightPageNum / state.totalPages) * 100;
    }

    progressFill.style.width = `${progressPercent}%`;

    // Arrow button disabled states
    if (state.isMobile) {
      navPrevBtn.disabled = state.mobileActivePage <= 1;
      navNextBtn.disabled = state.mobileActivePage >= state.totalPages;
    } else {
      navPrevBtn.disabled = state.currentSheetIndex <= 0;
      navNextBtn.disabled = state.currentSheetIndex >= state.totalSheets - 1;
    }

    // Ribbon animation position
    if (bookRibbon) {
      const ribbonOffset = (state.currentSheetIndex / state.totalSheets) * 20;
      bookRibbon.style.transform = `translateY(${ribbonOffset}px)`;
    }

    // Active TOC link indicator
    updateTocActiveLink();
  }

  function renderSheets() {
    sheets.forEach((sheet, index) => {
      sheet.classList.remove('active', 'flipping-forward', 'flipping-backward', 'show-mobile-right');

      if (index === state.currentSheetIndex) {
        sheet.classList.add('active');

        // On mobile: check if we should display left or right page
        if (state.isMobile) {
          const isEvenPage = state.mobileActivePage % 2 === 0;
          if (isEvenPage) {
            sheet.classList.add('show-mobile-right');
          }
        }
      }
    });

    updateHUD();
  }

  function turnForward() {
    if (state.isFlipping) return;

    if (state.isMobile) {
      if (state.mobileActivePage >= state.totalPages) return;
      state.mobileActivePage++;
      state.currentSheetIndex = Math.floor((state.mobileActivePage - 1) / 2);
    } else {
      if (state.currentSheetIndex >= state.totalSheets - 1) return;
      state.currentSheetIndex++;
    }

    playPaperTurnSound();
    animateSheetFlip('forward');
  }

  function turnBackward() {
    if (state.isFlipping) return;

    if (state.isMobile) {
      if (state.mobileActivePage <= 1) return;
      state.mobileActivePage--;
      state.currentSheetIndex = Math.floor((state.mobileActivePage - 1) / 2);
    } else {
      if (state.currentSheetIndex <= 0) return;
      state.currentSheetIndex--;
    }

    playPaperTurnSound();
    animateSheetFlip('backward');
  }

  function animateSheetFlip(direction) {
    state.isFlipping = true;
    renderSheets();

    const activeSheet = sheets[state.currentSheetIndex];
    if (activeSheet) {
      const animClass = direction === 'forward' ? 'flipping-forward' : 'flipping-backward';
      activeSheet.classList.add(animClass);

      setTimeout(() => {
        activeSheet.classList.remove(animClass);
        state.isFlipping = false;
      }, 650);
    } else {
      state.isFlipping = false;
    }
  }

  function jumpToPage(pageNum) {
    pageNum = Math.max(1, Math.min(pageNum, state.totalPages));
    const targetSheetIndex = Math.floor((pageNum - 1) / 2);

    state.mobileActivePage = pageNum;
    const direction = targetSheetIndex >= state.currentSheetIndex ? 'forward' : 'backward';
    state.currentSheetIndex = targetSheetIndex;

    playPaperTurnSound();
    animateSheetFlip(direction);
    closeToc();
  }

  // =========================================================================
  // OPEN & CLOSE BOOK TRANSITIONS
  // =========================================================================
  function openBook(targetPage = 1) {
    state.isOpen = true;
    coverScene.classList.remove('active');
    coverScene.setAttribute('aria-hidden', 'true');

    readerScene.classList.add('active');
    readerScene.setAttribute('aria-hidden', 'false');

    jumpToPage(targetPage);

    // Auto-start music from folder musik when user opens the book
    initAudioContext();
    if (bgMusic && bgMusic.paused) {
      bgMusic.play().then(() => {
        showToast('Memutar musik: Piano & Suara Hujan');
      }).catch((e) => {
        console.log('Autoplay prevented until user gesture:', e);
      });
    }
  }

  function closeBook() {
    state.isOpen = false;
    readerScene.classList.remove('active');
    readerScene.setAttribute('aria-hidden', 'true');

    coverScene.classList.add('active');
    coverScene.setAttribute('aria-hidden', 'false');

    chapterIndicator.textContent = 'Sampul Depan';
  }

  btnOpenBook.addEventListener('click', () => openBook(1));
  coverBook3d.addEventListener('click', () => openBook(1));

  btnResumeBook.addEventListener('click', () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const target = saved ? parseInt(saved, 10) : 1;
    openBook(target);
  });

  btnHome.addEventListener('click', () => {
    if (state.isOpen) {
      closeBook();
    }
  });

  btnReadAgain.addEventListener('click', () => {
    jumpToPage(1);
    closeBook();
    showToast('Membuka kembali dari awal...');
  });

  // Quote share button
  btnShareQuote.addEventListener('click', () => {
    const quoteText = `“Aku pernah berharap menjadi seseorang yang kamu pilih. Aku pernah membayangkan namaku menjadi alasan di balik senyummu. Namun, pada akhirnya, kamu menggenggam tangan orang lain, sementara aku belajar melepaskan tangan yang bahkan tidak pernah benar-benar menggenggamku.”\n— Pada Akhirnya, Bukan Aku`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(quoteText).then(() => {
        showToast('Kutipan renungan telah disalin ke clipboard!');
      }).catch(() => {
        showToast('Gagal menyalin otomatis.');
      });
    } else {
      showToast('Kutipan siap dibagikan!');
    }
  });

  // Navigation Arrows
  navPrevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    turnBackward();
  });
  navNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    turnForward();
  });

  // Clicking on left or right pages to flip
  bookSpread.addEventListener('click', (e) => {
    // If clicked on interactive button inside (like TOC item or share button), do not flip
    if (e.target.closest('button') || e.target.closest('li[data-goto]')) return;

    const rect = bookSpread.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (state.isMobile) {
      if (clickX > halfWidth) {
        turnForward();
      } else {
        turnBackward();
      }
    } else {
      if (clickX > halfWidth) {
        turnForward();
      } else {
        turnBackward();
      }
    }
  });

  // =========================================================================
  // TABLE OF CONTENTS (DRAWER & IN-PAGE TOC)
  // =========================================================================
  function openToc() {
    tocDrawer.classList.add('open');
    tocDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeToc() {
    tocDrawer.classList.remove('open');
    tocDrawer.setAttribute('aria-hidden', 'true');
  }

  btnToc.addEventListener('click', openToc);
  tocCloseBtn.addEventListener('click', closeToc);
  tocBackdrop.addEventListener('click', closeToc);

  tocJumpLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const gotoPage = parseInt(link.getAttribute('data-goto'), 10);
      if (!state.isOpen) {
        openBook(gotoPage);
      } else {
        jumpToPage(gotoPage);
      }
    });
  });

  tocPageList.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const gotoPage = parseInt(item.getAttribute('data-goto'), 10);
      jumpToPage(gotoPage);
    });
  });

  function updateTocActiveLink() {
    const curPage = state.isMobile ? state.mobileActivePage : (state.currentSheetIndex * 2 + 1);
    tocJumpLinks.forEach(link => {
      const page = parseInt(link.getAttribute('data-goto'), 10);
      link.classList.toggle('active-link', page === curPage || page === curPage - 1);
    });
  }

  // =========================================================================
  // KEYBOARD CONTROLS
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    if (!state.isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        openBook(1);
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      turnForward();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      turnBackward();
    } else if (e.key === 'Escape') {
      const photoLightbox = document.getElementById('photoLightbox');
      if (photoLightbox && photoLightbox.classList.contains('active')) {
        photoLightbox.classList.remove('active');
        photoLightbox.setAttribute('aria-hidden', 'true');
      } else if (tocDrawer.classList.contains('open')) {
        closeToc();
      } else {
        closeBook();
      }
    }
  });

  // =========================================================================
  // TOUCH SWIPE GESTURES (MOBILE & TABLET)
  // =========================================================================
  bookSpread.addEventListener('touchstart', (e) => {
    state.touchStartX = e.changedTouches[0].screenX;
    state.touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  bookSpread.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - state.touchStartX;
    const deltaY = touchEndY - state.touchStartY;

    // Must be predominantly horizontal gesture and exceed threshold
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swiped Left -> Go Forward
        turnForward();
      } else {
        // Swiped Right -> Go Backward
        turnBackward();
      }
    }
  }, { passive: true });

  // Handle Window Resize (Responsive detection)
  window.addEventListener('resize', () => {
    const nowMobile = window.innerWidth <= 768;
    if (nowMobile !== state.isMobile) {
      state.isMobile = nowMobile;
      renderSheets();
    }
  });

  // =========================================================================
  // AMBIENT RAIN & DUST PARTICLES CANVAS
  // =========================================================================
  const canvas = document.getElementById('ambientCanvas');
  const ctx = canvas.getContext('2d');
  let animationFrameId;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Rain Drops
  const rainDrops = [];
  const RAIN_COUNT = 90;
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainDrops.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 24 + 18,
      speed: Math.random() * 7 + 9,
      opacity: Math.random() * 0.25 + 0.1
    });
  }

  // Floating Ambient Dust/Light Motes
  const dustMotes = [];
  const DUST_COUNT = 40;
  for (let i = 0; i < DUST_COUNT; i++) {
    dustMotes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.4,
      vy: Math.random() * 0.3 + 0.1,
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function drawAmbientAtmosphere() {
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Rain Streaks
    ctx.lineWidth = 1;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const drop = rainDrops[i];
      ctx.beginPath();
      ctx.strokeStyle = `rgba(183, 176, 170, ${drop.opacity})`;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 3, drop.y + drop.length);
      ctx.stroke();

      drop.y += drop.speed;
      drop.x -= 1.2; // wind angle

      if (drop.y > height) {
        drop.y = -drop.length;
        drop.x = Math.random() * (width + 100);
      }
    }

    // 2. Draw Dust Motes in Light Beam
    for (let i = 0; i < DUST_COUNT; i++) {
      const mote = dustMotes[i];
      ctx.beginPath();
      const goldColor = state.theme === 'candle' ? '255, 195, 115' : '200, 162, 81';
      ctx.fillStyle = `rgba(${goldColor}, ${mote.alpha})`;
      ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
      ctx.fill();

      mote.x += mote.vx;
      mote.y += mote.vy;

      if (mote.y > height) mote.y = 0;
      if (mote.x > width) mote.x = 0;
      if (mote.x < 0) mote.x = width;
    }

    animationFrameId = requestAnimationFrame(drawAmbientAtmosphere);
  }

  drawAmbientAtmosphere();

  // =========================================================================
  // PHOTO LIGHTBOX EVENT LISTENERS (letter.jpg)
  // =========================================================================
  const letterPhotoTrigger = document.getElementById('letterPhotoTrigger');
  const photoLightbox = document.getElementById('photoLightbox');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');

  if (letterPhotoTrigger && photoLightbox) {
    letterPhotoTrigger.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent turning page
      photoLightbox.classList.add('active');
      photoLightbox.setAttribute('aria-hidden', 'false');
    });

    if (lightboxCloseBtn) {
      lightboxCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        photoLightbox.classList.remove('active');
        photoLightbox.setAttribute('aria-hidden', 'true');
      });
    }

    if (lightboxBackdrop) {
      lightboxBackdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        photoLightbox.classList.remove('active');
        photoLightbox.setAttribute('aria-hidden', 'true');
      });
    }
  }

  // Initialize
  initBookmark();
  renderSheets();

});
