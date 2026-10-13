const COURSE_NUMBERS = [1, 2, 3, 4, 5, 6];
const COURSE_FIELDS = ['title', 'desc', 'date', 'location'];
const TITLE_MAX_LINES = 4;
const MIN_COURSES = 2;
const DEFAULT_COURSES = 2;
const MM = 96 / 25.4;
const CARD_GAP = 6.5 * MM;
// Cards per row for each course count. Rows are centred, so five courses sit
// as three over two. Three and four can't scale up (the area runs out of
// height first), so instead their cards change shape at the same text size:
// `tall` makes a card that share of the area's height, `wide` stretches the
// cards to fill the row.
const CARD_LAYOUTS = {
  2: { rows: [2] },
  3: { rows: [3], tall: 0.8 },
  4: { rows: [2, 2], wide: true },
  5: { rows: [3, 2] },
  6: { rows: [3, 3] }
};

const inpProgrammeTitle = document.getElementById('inp-programme-title');
const outProgrammeTitle = document.getElementById('out-programme-title');
const programmeTitleWrap = document.querySelector('.programme-title-wrap');

const downloadImageBtn = document.getElementById('download-image-btn');
const resetFormBtn = document.getElementById('reset-form-btn');
const descSizeDecreaseBtn = document.getElementById('desc-size-decrease-btn');
const descSizeIncreaseBtn = document.getElementById('desc-size-increase-btn');
const inpBg = document.getElementById('inp-bg');
const bgGrid = document.getElementById('bg-grid');
const colorGrid = document.getElementById('color-grid');
const bgImage = document.querySelector('#bg-img');
const bgLayer = document.querySelector('#bg-layer');
const logoImage = document.querySelector('.logo-wrap img');
const flyerEl = document.getElementById('flyer');
const flyerScaleWrap = document.querySelector('.flyer-scale-wrap');
const previewArea = document.querySelector('.preview-area');
const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
let backgroundLoadToken = 0;
let descriptionSizeStep = 0;
let courseCount = DEFAULT_COURSES;

const courseGrid = document.getElementById('course-grid');
const courseCountLabel = document.getElementById('course-count-label');
const courseCountDecreaseBtn = document.getElementById('course-count-decrease-btn');
const courseCountIncreaseBtn = document.getElementById('course-count-increase-btn');

// Every card starts from the size it has in the six-card layout (reshaped for
// the counts in CARD_LAYOUTS that ask for it), so its text never changes
// size. With fewer courses the whole block is scaled up as one, gaps
// included, as far as the grid area allows, and centred in it.
function layoutCards() {
  const areaWidth = courseGrid.clientWidth;
  const areaHeight = courseGrid.clientHeight;
  const layout = CARD_LAYOUTS[courseCount];
  const rows = layout.rows;
  const maxCols = Math.max.apply(null, rows);
  let cardWidth = (areaWidth - 2 * CARD_GAP) / 3;
  let cardHeight = (areaHeight - CARD_GAP) / 2;
  if (layout.wide) {
    cardWidth = (areaWidth - (maxCols - 1) * CARD_GAP) / maxCols;
  }
  if (layout.tall) {
    cardHeight = areaHeight * layout.tall;
  }
  const blockWidth = maxCols * cardWidth + (maxCols - 1) * CARD_GAP;
  const blockHeight = rows.length * cardHeight + (rows.length - 1) * CARD_GAP;
  const scale = Math.min(areaWidth / blockWidth, areaHeight / blockHeight);
  const top = (areaHeight - blockHeight * scale) / 2;

  let courseNum = 1;
  rows.forEach(function(cols, rowIndex) {
    const rowWidth = (cols * cardWidth + (cols - 1) * CARD_GAP) * scale;
    const left = (areaWidth - rowWidth) / 2;
    for (let col = 0; col < cols; col++) {
      const card = courseGrid.querySelector('.course-card[data-course="' + courseNum + '"]');
      const x = left + col * (cardWidth + CARD_GAP) * scale;
      const y = top + rowIndex * (cardHeight + CARD_GAP) * scale;
      card.style.width = cardWidth + 'px';
      card.style.height = cardHeight + 'px';
      card.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
      courseNum += 1;
    }
  });
}

function setCourseCount(count) {
  courseCount = Math.max(MIN_COURSES, Math.min(COURSE_NUMBERS.length, count));
  COURSE_NUMBERS.forEach(function(n) {
    const hidden = n > courseCount;
    courseGrid.querySelector('.course-card[data-course="' + n + '"]').hidden = hidden;
    document.querySelector('.course-group[data-course="' + n + '"]').hidden = hidden;
  });
  courseCountLabel.textContent = String(courseCount);
  courseCountDecreaseBtn.disabled = courseCount <= MIN_COURSES;
  courseCountIncreaseBtn.disabled = courseCount >= COURSE_NUMBERS.length;
  layoutCards();
  // A hidden card measures zero height, so a description typed (or restored)
  // while it was hidden needs its clamp worked out again once it shows.
  COURSE_NUMBERS.forEach(applyDescriptionClamp);
}

// The flyer is a fixed 297x210mm block, so it has to be scaled down to fit the
// preview pane. A CSS transform shrinks only the paint, not the layout box the
// flex parent centres against, so the wrapper is resized to match.
function fitFlyerToPreview() {
  const flyerWidth = flyerEl.offsetWidth;
  const flyerHeight = flyerEl.offsetHeight;

  if (!flyerWidth || !flyerHeight) {
    return;
  }

  const styles = window.getComputedStyle(previewArea);
  const availableWidth = previewArea.clientWidth
    - parseFloat(styles.paddingLeft)
    - parseFloat(styles.paddingRight);
  // Height comes from the viewport rather than the pane: the pane is
  // content-sized in the stacked layout, so measuring it here would feed the
  // wrapper size we're about to set back into the next calculation.
  const availableHeight = window.innerHeight
    - parseFloat(styles.paddingTop)
    - parseFloat(styles.paddingBottom);
  const scale = Math.min(1, availableWidth / flyerWidth, availableHeight / flyerHeight);

  flyerEl.style.transform = 'scale(' + scale + ')';
  flyerScaleWrap.style.width = (flyerWidth * scale) + 'px';
  flyerScaleWrap.style.height = (flyerHeight * scale) + 'px';
}

function updateProgrammeTitle() {
  const val = inpProgrammeTitle.value.trim();
  outProgrammeTitle.textContent = val;

  outProgrammeTitle.style.fontSize = '42px';
  outProgrammeTitle.style.overflowWrap = 'normal';
  let size = 42;
  const maxHeight = programmeTitleWrap.clientHeight;
  const maxWidth = programmeTitleWrap.clientWidth;
  const lineHeight = parseFloat(window.getComputedStyle(outProgrammeTitle).lineHeight) / 42;
  // Width matters as much as height: a long unbreakable word keeps the heading
  // one line tall while pushing it out of the band and over the logo, and the
  // h1's own box stays at the wrap width, so only scrollWidth sees it.
  // Capping the line count keeps long titles a tidy block rather than a tall
  // stack of big text.
  function overflows() {
    const lines = Math.round(outProgrammeTitle.scrollHeight / (size * lineHeight));
    return lines > TITLE_MAX_LINES
      || outProgrammeTitle.scrollHeight > maxHeight
      || outProgrammeTitle.scrollWidth > maxWidth;
  }
  while (size > 18 && overflows()) {
    size -= 1;
    outProgrammeTitle.style.fontSize = size + 'px';
  }
  // Last resort at the size floor: break a huge word rather than let the
  // wrap clip it. Only now, so a long word shrinks before it splits.
  if (overflows()) {
    outProgrammeTitle.style.overflowWrap = 'anywhere';
  }
}

function updateCourseField(courseNum, field) {
  const input = document.getElementById('inp-c' + courseNum + '-' + field);
  const out = document.querySelector('[data-out="c' + courseNum + '-' + field + '"]');
  const val = input.value.trim();

  if (field === 'date') {
    out.textContent = val || 'TBC';
    updateDateTile(courseNum, val);
  } else if (field === 'location') {
    out.textContent = val || 'TBC';
  } else if (field === 'desc') {
    out.textContent = val;
    out.classList.toggle('is-empty', !val);
    applyDescriptionClamp(courseNum);
  } else {
    out.textContent = val;
    // A title that wraps to a second line leaves the description one line less.
    applyDescriptionClamp(courseNum);
  }
}

// The date field is free text. "21 Oct", "Tue 21 October" or "3rd Dec 2026"
// becomes the big day/month tile; anything else ("Every Tuesday", "Spring
// term") stays as text in the meta row rather than being mangled into a tile.
// Month and weekday are real names, so "2 days" or "Until 3 Dec" don't turn
// into a misleading tile.
const DATE_TILE_PATTERN = new RegExp(
  '^(?:(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\\.?,?\\s+)?'
  + '(\\d{1,2})(?:st|nd|rd|th)?\\s+'
  + '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
  + '\\.?(?:\\s+\\d{4})?$',
  'i'
);

function updateDateTile(courseNum, val) {
  const card = document.querySelector('.course-card[data-course="' + courseNum + '"]');
  const tile = card.querySelector('.date-tile');
  const match = val.match(DATE_TILE_PATTERN);
  card.classList.toggle('has-date-tile', !!match);
  tile.querySelector('.date-tile-day').textContent = match ? match[1] : '';
  tile.querySelector('.date-tile-month').textContent = match ? match[2].slice(0, 3) : '';
  applyDescriptionClamp(courseNum);
}

// The description stretches to fill whatever is left between the title and the
// meta row, so how many lines that is depends on the text size and on how many
// lines the title took. Clamping to the measured count cuts it at a line
// boundary with an ellipsis instead of slicing a line in half.
function applyDescriptionClamp(courseNum) {
  const out = document.querySelector('[data-out="c' + courseNum + '-desc"]');

  if (out.classList.contains('is-empty')) {
    return;
  }

  const lineHeight = parseFloat(window.getComputedStyle(out).lineHeight);

  if (!lineHeight) {
    return;
  }

  const lines = Math.max(1, Math.floor(out.clientHeight / lineHeight));
  out.style.webkitLineClamp = String(lines);
}

const QR_HINT = 'Generates one QR code, shown to the left of the title.';

function updateQr() {
  const url = document.getElementById('inp-programme-url').value.trim();
  const qrWrap = document.getElementById('programme-qr');
  const qrBox = qrWrap.querySelector('.qr-mini-box');
  const hint = document.getElementById('programme-url-hint');
  qrBox.innerHTML = '';
  hint.textContent = QR_HINT;
  hint.classList.remove('is-error');

  // A QR code holds only so much: past roughly 2,300 characters the library
  // throws, so treat that like no link and say why rather than leave a stale code.
  let svg = '';
  if (url) {
    try {
      svg = new QRCode({
        content: url,
        width: 256,
        height: 256,
        color: '#1a0f1f',
        background: '#ffffff',
        ecl: 'M',
        join: true,
        padding: 0
      }).svg();
    } catch (error) {
      hint.textContent = 'This link is too long for a QR code. Try a shorter link.';
      hint.classList.add('is-error');
    }
  }

  if (!svg) {
    qrWrap.classList.add('is-empty');
    flyerEl.classList.remove('has-qr');
    updateProgrammeTitle();
    return;
  }

  qrWrap.classList.remove('is-empty');
  flyerEl.classList.add('has-qr');
  qrBox.innerHTML = svg;
  const svgEl = qrBox.querySelector('svg');
  if (svgEl) {
    if (!svgEl.getAttribute('viewBox')) {
      svgEl.setAttribute('viewBox', '0 0 256 256');
    }
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.display = 'block';
  }
  updateProgrammeTitle();
}

function applyDescriptionTextSize() {
  const size = 14 + descriptionSizeStep;
  flyerEl.style.setProperty('--course-desc-size', size + 'px');
  descSizeDecreaseBtn.disabled = descriptionSizeStep <= -4;
  descSizeIncreaseBtn.disabled = descriptionSizeStep >= 6;
  COURSE_NUMBERS.forEach(applyDescriptionClamp);
}

function changeDescriptionTextSize(delta) {
  const nextStep = Math.max(-4, Math.min(6, descriptionSizeStep + delta));
  if (nextStep === descriptionSizeStep) {
    return;
  }

  descriptionSizeStep = nextStep;
  applyDescriptionTextSize();
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
  setLogoForBackground(false);
}

// The white logo only reads over a blurred photo; on the pale solid colours it
// all but disappears, so those get the colour logo instead.
function setLogoForBackground(hasPhoto) {
  logoImage.src = hasPhoto ? 'Sail_NEW3.png' : 'SaIL-logo-colour.png';
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
  setLogoForBackground(true);
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
  bgLayer.style.background = '';
  showBackgroundImage(src);
  clearAllThumbSelections();
  if (thumbEl) thumbEl.classList.add('selected');
}

function selectColor(color, thumbEl) {
  hideBackgroundImage();
  bgLayer.style.background = color;
  clearAllThumbSelections();
  if (thumbEl) thumbEl.classList.add('selected');
}

function makeImageFileName() {
  const title = (inpProgrammeTitle.value.trim() || 'Course Programme').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'Course Programme';
  return title + '.jpg';
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
  if (!flyerEl || !window.htmlToImage) {
    return;
  }

  downloadImageBtn.disabled = true;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(flyerEl.querySelectorAll('img'));
    await Promise.all(images.map(function(img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function(resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));

    // Don't pass canvasWidth/canvasHeight: html-to-image already multiplies
    // them by pixelRatio internally, so supplying pre-multiplied values
    // squares the ratio (a "3x" export was really 9x, ~864dpi and tens of MB).
    const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
    const canvas = await window.htmlToImage.toCanvas(flyerEl, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      imagePlaceholder: transparentPixel,
      style: {
        margin: '0',
        transform: 'none'
      }
    });

    // JPEG instead of PNG: the flyer is always fully opaque (backgroundColor
    // above fills it in), and PNG's lossless compression makes a full-bleed
    // background balloon to tens of MB — far too big to email. JPEG at
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
  } catch (error) {
    // Without this the button silently re-enables and nothing downloads —
    // the usual cause is opening index.html straight off disk, where the
    // browser blocks reading the images back out for the export.
    window.alert('Could not generate the flyer image.\n\n' + error.message
      + '\n\nIf you opened this file directly, try serving the folder over http instead.');
  } finally {
    downloadImageBtn.disabled = false;
  }
}

function resetForm() {
  inpProgrammeTitle.value = '';

  COURSE_NUMBERS.forEach(function(n) {
    COURSE_FIELDS.forEach(function(field) {
      document.getElementById('inp-c' + n + '-' + field).value = '';
      updateCourseField(n, field);
    });
  });
  document.getElementById('inp-programme-url').value = '';
  updateQr();

  hideBackgroundImage();
  bgLayer.style.background = '';
  inpBg.value = '';
  const customThumb = bgGrid.querySelector('.bg-thumb-custom');
  if (customThumb) customThumb.parentNode.removeChild(customThumb);
  clearAllThumbSelections();

  descriptionSizeStep = 0;
  setCourseCount(DEFAULT_COURSES);
  applyDescriptionTextSize();

  updateProgrammeTitle();
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

inpProgrammeTitle.addEventListener('input', updateProgrammeTitle);

COURSE_NUMBERS.forEach(function(n) {
  COURSE_FIELDS.forEach(function(field) {
    document.getElementById('inp-c' + n + '-' + field).addEventListener('input', function() {
      updateCourseField(n, field);
    });
  });
});

document.getElementById('inp-programme-url').addEventListener('input', updateQr);

downloadImageBtn.addEventListener('click', downloadFlyerImage);
resetFormBtn.addEventListener('click', resetForm);
descSizeDecreaseBtn.addEventListener('click', function() {
  changeDescriptionTextSize(-1);
});
descSizeIncreaseBtn.addEventListener('click', function() {
  changeDescriptionTextSize(1);
});
courseCountDecreaseBtn.addEventListener('click', function() {
  setCourseCount(courseCount - 1);
});
courseCountIncreaseBtn.addEventListener('click', function() {
  setCourseCount(courseCount + 1);
});

window.addEventListener('resize', fitFlyerToPreview);

warnSafariUsers();
setCourseCount(DEFAULT_COURSES);
applyDescriptionTextSize();
fitFlyerToPreview();
updateProgrammeTitle();
COURSE_NUMBERS.forEach(function(n) {
  COURSE_FIELDS.forEach(function(field) {
    updateCourseField(n, field);
  });
});
updateQr();
hideBackgroundImage();
