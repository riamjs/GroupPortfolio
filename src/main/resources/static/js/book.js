/**
 * book.js - Clear-Book Portfolio Component
 * Handles the display of the 3D clear-book binder, cover, 6 inside pages with SVG borders,
 * back cover, realistic slow & smooth double-sided page flips, and easy easter eggs.
 */

class ClearBook {
  constructor(options = {}) {
    this.options = Object.assign({
      containerId: 'book-overlay-container',
      theme: null,
      onClose: null,
      onOpenGuestbook: null
    }, options);

    this.currentMember = null;
    this.currentPageIndex = 0;
    this.totalPages = 8;
    this.overlayElement = null;
    this.pagesElements = [];
    this.dotsElements = [];
    this.photoClickCount = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.isFlipping = false; // Prevents animation overlap during slow turn

    this.initDOM();
    this.bindGlobalKeys();
  }

  initDOM() {
    let container = document.getElementById(this.options.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.options.containerId;
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="book-overlay" id="bookOverlay" role="dialog" aria-modal="true" aria-label="Clear Book Portfolio">
        <div class="book-header-controls">
          <div class="book-member-pill" id="bookMemberPill">
            <span class="member-color-indicator" id="memberColorDot"></span>
            <span id="memberPillName">Member Portfolio</span>
          </div>
          <button class="book-close-btn" id="bookCloseBtn" title="Close Portfolio (Esc)" aria-label="Close">✕</button>
        </div>

        <div class="book-container" id="bookContainer">
          <div class="book-spine">
            <div class="book-spine-stitching"></div>
          </div>
          <div id="pagesDeck" style="position:relative; width:100%; height:100%;"></div>
        </div>

        <div class="book-bottom-nav">
          <button class="book-nav-btn" id="prevPageBtn" title="Previous Page (←)">‹ Prev Page</button>
          <div class="book-page-dots" id="bookPageDots"></div>
          <button class="book-nav-btn" id="nextPageBtn" title="Next Page (→)">Next Page ›</button>
        </div>

        <div class="book-key-hints">Tip: Use [←] [→] arrow keys to flip smoothly • [Esc] to return to desk</div>
      </div>
    `;

    this.overlayElement = document.getElementById('bookOverlay');
    this.deckElement = document.getElementById('pagesDeck');
    this.dotsContainer = document.getElementById('bookPageDots');
    this.prevBtn = document.getElementById('prevPageBtn');
    this.nextBtn = document.getElementById('nextPageBtn');
    this.closeBtn = document.getElementById('bookCloseBtn');
    this.memberPillName = document.getElementById('memberPillName');
    this.memberColorDot = document.getElementById('memberColorDot');

    this.closeBtn.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', () => this.prevPage());
    this.nextBtn.addEventListener('click', () => this.nextPage());

    // Drag / Swipe support
    this.deckElement.addEventListener('mousedown', (e) => this.handleDragStart(e));
    window.addEventListener('mouseup', (e) => this.handleDragEnd(e));
    this.deckElement.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    this.deckElement.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;

      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.prevPage();
      }
    });
  }

  handleDragStart(e) {
    if (this.isFlipping || e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
  }

  handleDragEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const diff = e.clientX - this.dragStartX;
    if (diff < -50) {
      this.nextPage();
    } else if (diff > 50) {
      this.prevPage();
    }
  }

  handleTouchStart(e) {
    if (this.isFlipping || (e.touches && e.touches.length === 0)) return;
    this.isDragging = true;
    this.dragStartX = e.touches[0].clientX;
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (e.changedTouches && e.changedTouches.length > 0) {
      const diff = e.changedTouches[0].clientX - this.dragStartX;
      if (diff < -50) {
        this.nextPage();
      } else if (diff > 50) {
        this.prevPage();
      }
    }
  }

  isOpen() {
    return this.overlayElement && this.overlayElement.classList.contains('active');
  }

  open(memberData, { theme = this.options.theme || memberData.deskItem } = {}) {
    this.overlayElement.classList.toggle('theme-pad', theme === 'pad' || theme === 'intermediate-pad');
    this.overlayElement.classList.toggle('theme-folder', theme === 'folder' || theme === 'long-folder');
    this.overlayElement.classList.toggle('theme-themebook', theme === 'themebook' || theme === 'theme-book');
    this.overlayElement.classList.toggle('theme-spiral', theme === 'spiral' || theme === 'spiral-notebook');
    for (const item of ['spiral-notebook', 'long-folder', 'theme-book', 'intermediate-pad']) {
      this.overlayElement.classList.toggle('theme-' + item, item === theme);
    }
    this.spiralTurn?.kill();
    this.isSpiral = this.overlayElement.classList.contains('theme-spiral');
    this.currentMember = memberData;
    this.currentPageIndex = 0;
    this.photoClickCount = 0;
    this.isFlipping = false;

    // Header info
    this.memberPillName.textContent = memberData.name + " (" + memberData.section + ")";
    this.memberColorDot.style.backgroundColor = memberData.coverColor || '#FF7A00';

    this.renderPages();
    this.overlayElement.classList.add('active');
    this.updatePageStates();
  }

  close() {
    if (!this.isOpen()) return;
    this.spiralTurn?.kill();
    this.isDragging = false;
    this.overlayElement.classList.remove('active');
    if (typeof this.options.onClose === 'function') {
      this.options.onClose();
    }
  }

  renderPages() {
    const member = this.currentMember;
    const coverColor = member.coverColor || '#FF7A00';
    this.deckElement.innerHTML = '';
    this.dotsContainer.innerHTML = '';
    this.pagesElements = [];
    this.dotsElements = [];

    const pageConfigs = [];
    const folderSheets = this.overlayElement.classList.contains('theme-folder');
    const looseSheets = folderSheets || this.overlayElement.classList.contains('theme-pad');

    // Page 0: Cover
    if (!looseSheets) pageConfigs.push({
      type: 'cover',
      title: 'Cover'
    });

    if (this.isSpiral) {
      pageConfigs.push({ type: 'divider', title: '1st Semester' }, { type: 'profile', title: 'Profile' });
      const rings = '<i></i>'.repeat(18);
      this.deckElement.innerHTML = `<div class="spiral-left" aria-hidden="true"></div>
        <div class="spiral-shadow" aria-hidden="true"></div>
        <div class="spiral-coil" aria-hidden="true">${rings}</div>`;
    }

    // Pages 1 to 6 from JSON
    const titles = ['About Me', 'Hobbies', 'Skills', 'Projects', 'Fun Facts', 'Contact/Goals'];
    for (let i = 0; i < 6; i++) {
      const pageData = (member.pages && member.pages[i]) ? member.pages[i] : {
        title: titles[i],
        content: `Content for ${titles[i]} will be added soon.`,
        border: 'wavy-pink.svg'
      };
      pageConfigs.push({
        type: 'inside',
        index: i + 1,
        pageData: pageData,
        skills: (i === 2) ? member.skills : null
      });
    }

    // Page 7: Back Cover
    if (!looseSheets) pageConfigs.push({
      type: 'back-cover',
      title: 'Back Cover'
    });

    this.totalPages = pageConfigs.length;

    pageConfigs.forEach((cfg, idx) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'book-page';
      pageEl.dataset.pageIndex = idx;

      let frontHTML = '';
      let backHTML = this.isSpiral ? '' : `
        <div class="backside-pocket-decor">
          <span>
            <svg class="uicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </span>
          <h4>Clear-Book Sleeve #${idx + 1}</h4>
          <p>Official student submission for <em>Advanced Emerging Technologies</em>.</p>
          <div style="font-size:0.75rem; color:#94A3B8; margin-top:8px;">Turn backward or forward with arrows</div>
        </div>
      `;

      if (cfg.type === 'cover') {
        frontHTML = `
          <div class="book-cover" style="background: linear-gradient(145deg, ${coverColor} 0%, ${this.adjustColorBrightness(coverColor, -35)} 100%);">
            <div class="cover-header">
              <span class="cover-badge">Student Portfolio</span>
              <h1 class="cover-title">PORTFOLIO</h1>
              <div class="cover-subject">${member.subject || 'Advanced Emerging Technologies'}</div>
            </div>

            <div class="cover-photo-wrap" id="coverPhotoWrap">
              <img class="cover-photo-circle" id="coverPhotoImg" src="${member.photo || 'assets/photos/member1.svg'}" alt="${member.name}">
              <span class="photo-easter-hint">Double-click to spin</span>
            </div>

            <div class="cover-footer">
              <h2 class="cover-name">${member.name}</h2>
              <div class="cover-section">${member.section}</div>
              <div class="cover-tagline">“${member.tagline || 'Emerging technologies, emerging deadlines'}”</div>
            </div>
          </div>
        `;

        if (this.overlayElement.classList.contains('theme-spiral')) {
          frontHTML = `<div class="riam-collage-cover">
            <div class="riam-collage-tag"><img src="${member.photo}" alt="">
            <span><strong>PORTFOLIO</strong><b>${member.name}</b><small>★ SECTION &nbsp; ${member.section}</small></span></div>
          </div>`;
        }

        // Easy Easter Egg: Only 2 clicks (double click) to spin!
        setTimeout(() => {
          const photoWrap = pageEl.querySelector('#coverPhotoWrap');
          const photoImg = pageEl.querySelector('#coverPhotoImg');
          if (photoWrap && photoImg) {
            photoWrap.addEventListener('click', (e) => {
              e.stopPropagation();
              this.photoClickCount++;
              if (this.photoClickCount >= 2) {
                this.photoClickCount = 0;
                photoImg.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                photoImg.style.transform = 'rotate(720deg) scale(1.18)';
                setTimeout(() => {
                  photoImg.style.transform = 'rotate(0deg) scale(1)';
                }, 1200);
                if (window.PortfolioHumor && typeof window.PortfolioHumor.playSound === 'function') {
                  window.PortfolioHumor.playSound('spin');
                  window.PortfolioHumor.showToast('Avatar spin easter egg unlocked!');
                }
              } else {
                photoImg.style.transition = 'transform 0.15s ease';
                photoImg.style.transform = 'scale(0.94) rotate(15deg)';
                setTimeout(() => {
                  photoImg.style.transform = 'scale(1) rotate(0deg)';
                }, 150);
              }
            });
          }
        }, 0);

      } else if (cfg.type === 'divider') {
        pageEl.classList.add('spiral-divider');
        frontHTML = '<div class="semester-sheet"><h2>1st Semester</h2></div><span class="semester-tab">1st Sem</span>';
      } else if (cfg.type === 'profile') {
        frontHTML = `<div class="page-inner"><div class="page-body-content">
          <span class="page-category-tag">Page 1 of 7</span><h3 class="page-title">Profile</h3>
          <img class="spiral-portrait" src="${member.photo}" alt="">
          <h4>${member.name}</h4><p>${member.section}</p><p>${member.subject}</p>
          <p class="page-text">${member.tagline}</p></div></div>`;
      } else if (cfg.type === 'inside') {
        const borderFile = cfg.pageData.border || 'wavy-pink.svg';
        const borderSrc = `assets/borders/${borderFile}`;

        let extraHTML = '';
        if (cfg.skills?.length && this.overlayElement.classList.contains('theme-spiral')) {
          extraHTML = '<ul class="spiral-skills">' + cfg.skills.map(skill =>
            `<li><strong>${skill.name}</strong> — ${skill.funnyLabel}</li>`
          ).join('') + '</ul>';
        } else if (cfg.skills?.length && this.overlayElement.classList.contains('theme-themebook')) {
          extraHTML = '<ol class="themebook-skills">' + cfg.skills.map(skill =>
            `<li>${skill.name}</li>`
          ).join('') + '</ol>';
        } else if (cfg.skills && cfg.skills.length > 0) {
          extraHTML += `<div class="skills-container">`;
          cfg.skills.forEach(s => {
            extraHTML += `
              <div class="skill-row">
                <div class="skill-header">
                  <span class="skill-name">${s.name}</span>
                  <span class="skill-funny-label">${s.funnyLabel}</span>
                </div>
                <div class="skill-bar-bg">
                  <div class="skill-bar-fill" style="width: ${s.level}%;"></div>
                </div>
              </div>
            `;
          });
          extraHTML += `</div>`;
        }

        if (cfg.index === 5) {
          extraHTML += `
            <div style="margin-top: 14px; text-align: center;">
              <button class="page-action-btn" id="roastMeBtn" style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                <svg class="uicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                Roast Me!
              </button>
              <div class="roast-result-box" id="roastResultBox" style="display:none;"></div>
            </div>
          `;
        }

        if (cfg.index === 6) {
          extraHTML += `
            <div style="margin-top: 14px; text-align: center;">
              <button class="book-guestbook-trigger" id="openGuestbookFromBookBtn" style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                <svg class="uicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Leave a Sticky Note for ${member.name.split(' ')[0]}
              </button>
            </div>
          `;
        }

        frontHTML = `
          <div class="page-inner">
            <img class="page-svg-border" src="${borderSrc}" alt="Page Border">
            <div class="page-body-content">
              ${folderSheets ? `<header class="folder-letterhead"><span>${member.name}</span><span>${member.section}</span></header>` : ''}
              <span class="page-category-tag">Page ${this.isSpiral ? cfg.index + 1 : cfg.index} of ${this.isSpiral ? 7 : 6}</span>
              <h3 class="page-title">${cfg.pageData.title}</h3>
              <div class="page-text">${cfg.pageData.content}</div>
              ${extraHTML}
              ${folderSheets && cfg.index === 6 ? '<span class="folder-stamp">APPROVED</span>' : ''}
            </div>
          </div>
        `;

        setTimeout(() => {
          const roastBtn = pageEl.querySelector('#roastMeBtn');
          const roastBox = pageEl.querySelector('#roastResultBox');
          if (roastBtn && roastBox) {
            roastBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const roasts = [
                "Has 47 browser tabs open and uses none of them.",
                "Says 'quick 5 minute break' and returns 3 business days later.",
                "Believes 'git push --force' is a valid problem-solving strategy.",
                "Debugs with console.log('test 1'), console.log('here'), console.log('WHY PLEASE').",
                "Spends 2 hours searching for a Spotify playlist before writing 1 line of HTML.",
                "Can explain the theory of quantum computing, but forgets the semicolon on line 4.",
                "Owns a reusable water bottle that has seen more iced coffee than water.",
                "Reads StackOverflow answers from 2013 with blind religious faith."
              ];
              const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
              roastBox.textContent = `"${randomRoast}"`;
              roastBox.style.display = 'block';
              if (window.PortfolioHumor && typeof window.PortfolioHumor.playSound === 'function') {
                window.PortfolioHumor.playSound('pop');
              }
            });
          }

          const guestbookBtn = pageEl.querySelector('#openGuestbookFromBookBtn');
          if (guestbookBtn) {
            guestbookBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.close();
              if (typeof this.options.onOpenGuestbook === 'function') {
                this.options.onOpenGuestbook(member.id);
              }
            });
          }
        }, 0);

      } else if (cfg.type === 'back-cover') {
        frontHTML = `
          <div class="book-back-cover" style="background: linear-gradient(145deg, ${this.adjustColorBrightness(coverColor, -20)} 0%, ${this.adjustColorBrightness(coverColor, -55)} 100%);">
            <div>
              <span class="cover-badge">Course Finale</span>
              <h2 class="back-cover-title">The End</h2>
              <p class="back-cover-subtitle">(Please Clap)</p>
            </div>

            <div class="team-credits-card">
              <h4>AET Group Portfolio</h4>
              <p>Subject: <strong>Advanced Emerging Technologies</strong></p>
              <p>Tech: Three.js • GSAP • Spring Boot 3</p>
              <p style="margin-top: 6px; font-size: 0.75rem; opacity: 0.8;">Zero databases were harmed in the making of this portfolio.</p>
            </div>

            <div style="font-size: 0.85rem; opacity: 0.9;">
              Thank you for reviewing our clear-book!
            </div>
          </div>
        `;
      }

      if (this.isSpiral) pageEl.style.setProperty('--tint', Math.random() * 0.045);
      if (looseSheets) backHTML = '<div class="folder-sheet-back"></div>';

      // Assemble double-sided page with dynamic bending shadow
      pageEl.innerHTML = `
        <div class="page-face page-front">${frontHTML}</div>
        <div class="page-face page-back">${backHTML}</div>
        <div class="page-bend-shadow"></div>
      `;

      pageEl.addEventListener('click', (e) => {
        if (this.isFlipping) return;
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('.cover-photo-wrap')) return;

        const rect = pageEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX > rect.width * 0.55) {
          this.nextPage();
        } else if (clickX < rect.width * 0.45) {
          this.prevPage();
        }
      });

      this.deckElement.appendChild(pageEl);
      this.pagesElements.push(pageEl);

      const dot = document.createElement('div');
      dot.className = 'page-dot';
      dot.title = this.isSpiral ? (cfg.title || cfg.pageData.title) : looseSheets ? cfg.pageData.title : (idx === 0) ? 'Cover' : (idx === this.totalPages - 1) ? 'Back Cover' : `Page ${idx}`;
      dot.addEventListener('click', () => {
        if (!this.isFlipping) this.goToPage(idx);
      });
      this.dotsContainer.appendChild(dot);
      this.dotsElements.push(dot);
    });
  }

  updatePageStates() {
    this.pagesElements.forEach((pageEl, idx) => {
      pageEl.classList.remove('flipped', 'active-page', 'next-page');

      if (idx < this.currentPageIndex) {
        pageEl.classList.add('flipped');
        pageEl.style.zIndex = idx + 10;
      } else if (idx === this.currentPageIndex) {
        pageEl.classList.add('active-page');
        pageEl.style.zIndex = 50;
      } else if (idx === this.currentPageIndex + 1) {
        pageEl.classList.add('next-page');
        pageEl.style.zIndex = 40;
      } else {
        pageEl.style.zIndex = 30 - idx;
      }
    });

    this.dotsElements.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.currentPageIndex);
    });

    this.prevBtn.disabled = (this.currentPageIndex === 0 || this.isFlipping);
    this.nextBtn.disabled = (this.currentPageIndex >= this.totalPages - 1 || this.isFlipping);
  }

  nextPage() {
    if (this.isFlipping || this.currentPageIndex >= this.totalPages - 1) return;

    if (this.isSpiral) return this.turnSpiral(this.currentPageIndex + 1);
    this.isFlipping = true;
    const flippingPage = this.pagesElements[this.currentPageIndex];
    flippingPage.classList.add('turning');

    if (window.PortfolioHumor && typeof window.PortfolioHumor.playSound === 'function') {
      window.PortfolioHumor.playSound('pageFlipSlow');
    }

    this.currentPageIndex++;
    this.updatePageStates();

    setTimeout(() => {
      flippingPage.classList.remove('turning');
      this.isFlipping = false;
      this.updatePageStates();
    }, 1350); // Matches slow realistic CSS duration
  }

  prevPage() {
    if (this.isFlipping || this.currentPageIndex <= 0) return;

    if (this.isSpiral) return this.turnSpiral(this.currentPageIndex - 1);
    this.isFlipping = true;
    this.currentPageIndex--;
    const returningPage = this.pagesElements[this.currentPageIndex];
    returningPage.classList.add('turning');

    if (window.PortfolioHumor && typeof window.PortfolioHumor.playSound === 'function') {
      window.PortfolioHumor.playSound('pageFlipSlow');
    }

    this.updatePageStates();

    setTimeout(() => {
      returningPage.classList.remove('turning');
      this.isFlipping = false;
      this.updatePageStates();
    }, 1350);
  }

  goToPage(idx) {
    if (this.isFlipping || idx === this.currentPageIndex || idx < 0 || idx >= this.totalPages) return;
    if (this.isSpiral) return this.turnSpiral(idx);
    this.currentPageIndex = idx;
    this.updatePageStates();
    if (window.PortfolioHumor && typeof window.PortfolioHumor.playSound === 'function') {
      window.PortfolioHumor.playSound('pageFlipSlow');
    }
  }

  turnSpiral(destination) {
    const forward = destination > this.currentPageIndex;
    const leaf = this.pagesElements[forward ? this.currentPageIndex : destination];
    const shadow = this.deckElement.querySelector('.spiral-shadow');
    this.currentPageIndex = destination;
    this.isFlipping = true;
    this.updatePageStates();
    const finish = () => {
      leaf.style.removeProperty('transform');
      shadow.style.removeProperty('opacity');
      shadow.style.removeProperty('transform');
      this.isFlipping = false;
      this.spiralTurn = null;
      this.updatePageStates();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap) {
      finish();
      return;
    }
    window.PortfolioHumor?.playSound('spiralPaper');
    leaf.style.zIndex = 90;
    const start = forward ? 0 : -180;
    this.spiralTurn = gsap.timeline({ onComplete: finish });
    this.spiralTurn.fromTo(leaf, { rotationY: start, z: 0, skewY: 0 },
      { rotationY: -180 - start, duration: 0.9, ease: 'power2.inOut' }, 0)
      .to(leaf, { z: 12, skewY: forward ? -1.4 : 1.4, duration: 0.45, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 0)
      .fromTo(shadow, { xPercent: forward ? 100 : -100 }, { xPercent: forward ? -100 : 100, duration: 0.9, ease: 'power2.inOut' }, 0)
      .fromTo(shadow, { opacity: 0 }, { opacity: 0.32, duration: 0.45, repeat: 1, yoyo: true }, 0);
  }

  adjustColorBrightness(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + percent;
    let b = ((num >> 8) & 0x00FF) + percent;
    let g = (num & 0x0000FF) + percent;
    return "#" + (
      0x1000000 +
      (r < 255 ? (r < 1 ? 0 : r) : 255) * 0x10000 +
      (b < 255 ? (b < 1 ? 0 : b) : 255) * 0x100 +
      (g < 255 ? (g < 1 ? 0 : g) : 255)
    ).toString(16).slice(1);
  }
}

window.ClearBook = ClearBook;
