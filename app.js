const inpTitle = document.getElementById('inp-title');
const inpSubtitle = document.getElementById('inp-subtitle');
const inpDate = document.getElementById('inp-date');
const inpLocation = document.getElementById('inp-location');
const inpUrl = document.getElementById('inp-url');

const quill = new Quill('#inp-desc-editor', {
  theme: 'snow',
  placeholder: 'Enter description text…',
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean']
    ]
  }
});

const outTitle = document.getElementById('out-title');
const outSubtitle = document.getElementById('out-subtitle');
const outSubtitleBox = document.getElementById('out-subtitle-box');
const outDate = document.getElementById('out-date');
const outLocation = document.getElementById('out-location');
const outQr = document.getElementById('out-qr');
const outPanel = document.getElementById('out-panel');
const downloadImageBtn = document.getElementById('download-image-btn');
const resetFormBtn = document.getElementById('reset-form-btn');
const descSizeDecreaseBtn = document.getElementById('desc-size-decrease-btn');
const descSizeIncreaseBtn = document.getElementById('desc-size-increase-btn');
const inpBg = document.getElementById('inp-bg');
const bgGrid = document.getElementById('bg-grid');
const colorGrid = document.getElementById('color-grid');
const bgImage = document.querySelector('#bg-img');
const imageDiv = document.querySelector('.image');
const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
let backgroundLoadToken = 0;
let descriptionSizeStep = 0;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateTitle() {
  const val = inpTitle.value.trim();
  const parts = val ? val.split(/\s+in\s+/i) : [];
  if (parts.length >= 2) {
    outTitle.innerHTML = escapeHtml(parts[0]) + ' in<br>' + escapeHtml(parts.slice(1).join(' in '));
  } else {
    outTitle.textContent = val;
  }

  outTitle.style.fontSize = '30px';
  let size = 30;
  while (size > 10 && outTitle.offsetHeight > 68) {
    size -= 1;
    outTitle.style.fontSize = size + 'px';
  }
}

function updateSubtitle() {
  const val = inpSubtitle.value.trim();
  outSubtitle.textContent = val;
  outSubtitleBox.classList.toggle('is-empty', !val);

  if (!val) {
    return;
  }

  // The diamond narrows quickly away from its centre, so the subtitle is
  // kept to a single short line by shrinking it (never wrapping wide) before
  // it's allowed to push the meta row and QR code further down the taper.
  outSubtitle.style.fontSize = '15px';
  let size = 15;
  while (size > 9 && outSubtitle.offsetHeight > 20) {
    size -= 1;
    outSubtitle.style.fontSize = size + 'px';
  }
}

function updateDate() {
  const val = inpDate.value.trim();
  outDate.textContent = val || 'TBC';
}

function updateLocation() {
  const val = inpLocation.value.trim();
  outLocation.textContent = val || 'TBC';
}

function updateDescription() {
  const text = quill.getText().trim();
  const html = quill.getSemanticHTML();
  outPanel.innerHTML = text.length === 0 ? '' : html;
}

function applyDescriptionTextSize() {
  const editorSize = 13 + descriptionSizeStep;
  const panelSize = 10 + descriptionSizeStep;
  document.getElementById('inp-desc-editor').style.setProperty('--desc-editor-font-size', editorSize + 'px');
  outPanel.style.fontSize = panelSize + 'px';
  descSizeDecreaseBtn.disabled = descriptionSizeStep <= -3;
  descSizeIncreaseBtn.disabled = descriptionSizeStep >= 6;
}

function changeDescriptionTextSize(delta) {
  const nextStep = Math.max(-3, Math.min(6, descriptionSizeStep + delta));
  if (nextStep === descriptionSizeStep) {
    return;
  }

  descriptionSizeStep = nextStep;
  applyDescriptionTextSize();
}

function updateQr() {
  const url = inpUrl.value.trim();
  outQr.innerHTML = '';

  if (!url) return;

  const svg = new QRCode({
    content: url,
    width: 256,
    height: 256,
    color: '#1a0f1f',
    background: '#ffffff',
    ecl: 'M',
    join: true,
    padding: 0
  }).svg();
  outQr.innerHTML = svg;
  const svgEl = outQr.querySelector('svg');
  if (svgEl) {
    if (!svgEl.getAttribute('viewBox')) {
      svgEl.setAttribute('viewBox', '0 0 256 256');
    }
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.display = 'block';
  }
}

function clearAllThumbSelections() {
  document.querySelectorAll('.bg-thumb').forEach(function(thumb) {
    thumb.classList.remove('selected');
  });
}

function hideBackgroundImage() {
  backgroundLoadToken += 1;
  bgImage.onload = null;
  bgImage.onerror = null;
  bgImage.src = transparentPixel;
  bgImage.style.display = 'none';
}

function inlineBackgroundImage(imgEl, loadToken) {
  if (!imgEl.currentSrc || imgEl.currentSrc.indexOf('data:') === 0) {
    return;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.drawImage(imgEl, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    if (loadToken === backgroundLoadToken) {
      imgEl.src = dataUrl;
    }
  } catch (error) {
    // Keep the original source if the browser blocks inlining.
  }
}

function showBackgroundImage(src) {
  backgroundLoadToken += 1;
  const loadToken = backgroundLoadToken;
  bgImage.style.display = 'block';
  bgImage.onload = function() {
    inlineBackgroundImage(bgImage, loadToken);
  };
  bgImage.onerror = function() {
    if (loadToken === backgroundLoadToken) {
      hideBackgroundImage();
    }
  };
  bgImage.src = src;
}

function selectBg(src, thumbEl) {
  imageDiv.style.background = '';
  showBackgroundImage(src);
  clearAllThumbSelections();
  if (thumbEl) thumbEl.classList.add('selected');
}

function selectColor(color, thumbEl) {
  hideBackgroundImage();
  imageDiv.style.background = color;
  clearAllThumbSelections();
  if (thumbEl) thumbEl.classList.add('selected');
}

function makeImageFileName() {
  const title = (inpTitle.value.trim() || 'Blank').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'Blank';
  const date = (inpDate.value.trim() || 'Blank').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'Blank';
  return title + ' - ' + date + '.jpg';
}

function isSafariBrowser() {
  const userAgent = navigator.userAgent;
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(userAgent);
}

function warnSafariUsers() {
  if (!isSafariBrowser()) {
    return;
  }

  window.alert('Safari is not fully supported in FlyerGen. Preview and image download may render incorrectly. For best results, use Chrome or Edge.');
}

function readFileAsDataUrl(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function() {
      resolve(reader.result);
    };
    reader.onerror = function() {
      reject(new Error('Could not read uploaded background image.'));
    };
    reader.readAsDataURL(file);
  });
}

async function downloadFlyerImage() {
  const flyer = document.getElementById('flyer');

  if (!flyer || !window.htmlToImage) {
    return;
  }

  downloadImageBtn.disabled = true;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(flyer.querySelectorAll('img'));
    await Promise.all(images.map(function(img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function(resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));

    const pixelRatio = Math.max(window.devicePixelRatio || 1, 3);
    const canvas = await window.htmlToImage.toCanvas(flyer, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      canvasWidth: flyer.offsetWidth * pixelRatio,
      canvasHeight: flyer.offsetHeight * pixelRatio,
      imagePlaceholder: transparentPixel,
      style: {
        margin: '0',
        transform: 'none'
      }
    });

    // JPEG instead of PNG: the flyer is always fully opaque (backgroundColor
    // above fills it in), and PNG's lossless compression makes the full-bleed
    // photo background balloon to tens of MB — far too big to email. JPEG at
    // high quality keeps it visually indistinguishable at a fraction of the size.
    const imageBlob = await new Promise(function(resolve) {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (!imageBlob) {
      throw new Error('Could not generate image export.');
    }

    const imageUrl = URL.createObjectURL(imageBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = makeImageFileName();
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(imageUrl);
  } finally {
    downloadImageBtn.disabled = false;
  }
}

function resetForm() {
  inpTitle.value = '';
  inpSubtitle.value = '';
  inpDate.value = '';
  inpLocation.value = '';
  inpUrl.value = '';
  quill.setContents([]);

  hideBackgroundImage();
  imageDiv.style.background = '';
  inpBg.value = '';
  const customThumb = bgGrid.querySelector('.bg-thumb-custom');
  if (customThumb) customThumb.parentNode.removeChild(customThumb);
  clearAllThumbSelections();

  updateTitle();
  updateSubtitle();
  updateDate();
  updateLocation();
  updateQr();
  updateDescription();
}

colorGrid.querySelectorAll('.color-swatch[data-color]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectColor(btn.dataset.color, btn);
  });
});

bgGrid.querySelectorAll('.bg-thumb[data-src]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectBg(btn.dataset.src, btn);
  });
});

inpBg.addEventListener('change', async function() {
  const file = inpBg.files[0];
  if (!file) return;

  const dataUrl = await readFileAsDataUrl(file);
  let existing = bgGrid.querySelector('.bg-thumb-custom');
  if (!existing) {
    existing = document.createElement('button');
    existing.className = 'bg-thumb bg-thumb-custom';
    bgGrid.insertBefore(existing, bgGrid.querySelector('label.bg-upload-btn'));
  }
  existing.style.backgroundImage = 'url(' + dataUrl + ')';
  selectBg(dataUrl, existing);
});

inpTitle.addEventListener('input', updateTitle);
inpSubtitle.addEventListener('input', updateSubtitle);
inpDate.addEventListener('input', updateDate);
inpLocation.addEventListener('input', updateLocation);
quill.on('text-change', updateDescription);

document.addEventListener('focusin', function(e) {
  if (e.target !== inpUrl) updateQr();
});

downloadImageBtn.addEventListener('click', downloadFlyerImage);
resetFormBtn.addEventListener('click', resetForm);
descSizeDecreaseBtn.addEventListener('click', function() {
  changeDescriptionTextSize(-1);
});
descSizeIncreaseBtn.addEventListener('click', function() {
  changeDescriptionTextSize(1);
});

warnSafariUsers();
applyDescriptionTextSize();
updateTitle();
updateSubtitle();
updateQr();
updateDescription();
hideBackgroundImage();
