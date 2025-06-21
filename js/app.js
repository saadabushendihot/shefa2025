// متغيرات عامة
let currentLectures = [];
let studentSummaries = [];

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
  // تعيين سنة حقوق النشر
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  
  // عرض البريد الإلكتروني للمتصفح إذا كان متاحاً
  setBrowserEmailDisplay();
});

function setBrowserEmailDisplay() {
  const emailInput = document.getElementById('browserEmailDisplay');
  emailInput.value = "جاري التحقق...";
  
  // في تطبيق عادي، لا يمكننا الوصول إلى بريد المستخدم المسجل
  // لذا سنعرض رسالة توضيحية
  setTimeout(() => {
    emailInput.value = "يتعذر تحديد البريد في الموقع العادي";
    emailInput.style.color = "red";
  }, 1500);
}

function showLoading(button) {
  const originalText = button.innerHTML;
  button.innerHTML = `<span class="loading"></span> جاري التحميل...`;
  button.disabled = true;
  return originalText;
}

function hideLoading(button, originalText) {
  button.innerHTML = originalText;
  button.disabled = false;
}

function showError(message) {
  document.getElementById('resultArea').innerHTML = `
    <div class="alert alert-danger">
      <i class="fas fa-exclamation-circle"></i> ${message}
    </div>
  `;
}

function showSuccess(message) {
  document.getElementById('resultArea').innerHTML = `
    <div class="alert alert-success">
      <i class="fas fa-check-circle"></i> ${message}
    </div>
  `;
}

function isValidEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
}

function generateFingerprint() {
  const userAgent = navigator.userAgent;
  const screenSize = `${screen.width}x${screen.height}`;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const raw = `${userAgent}|${screenSize}|${language}|${timezone}`;
  return sha256(raw);
}

function getDeviceId() {
  let storedId = localStorage.getItem('deviceId');
  if (!storedId) {
    storedId = generateFingerprint();
    localStorage.setItem('deviceId', storedId);
  }
  return storedId;
}

async function loadLectures() {
  const loadButton = document.getElementById('loadLecturesBtn');
  const originalButtonText = showLoading(loadButton);
  
  const enteredEmail = document.getElementById('emailInput').value.trim();
  const browserEmail = document.getElementById('browserEmailDisplay').value.trim();
  
  if (!enteredEmail) {
    hideLoading(loadButton, originalButtonText);
    showError("يرجى إدخال البريد الإلكتروني الخاص بالدورة");
    return;
  }
  
  if (!isValidEmail(enteredEmail)) {
    hideLoading(loadButton, originalButtonText);
    showError("تنسيق البريد الإلكتروني غير صحيح");
    return;
  }
  
  const deviceId = getDeviceId();
  const response = await fetchLecturesWithDeviceCheck(enteredEmail, deviceId);
  
  hideLoading(loadButton, originalButtonText);
  
  if (response.error) {
    showError(response.error);
    return;
  }
  
  // عرض معلومات الطالب
  document.getElementById('studentNameDisplay').textContent = response.studentName || 'غير معروف';
  document.getElementById('courseNumberDisplay').textContent = response.courseNumber || 'غير معروف';
  document.getElementById('studentInfoSection').classList.remove('d-none');
  
  // عرض جدول المحاضرات
  currentLectures = response.lectures || [];
  populateLecturesTable(currentLectures);
  
  // عرض المرفقات
  populateAttachments(currentLectures, response.attachments || []);
  
  // تهيئة قسم التلخيصات
  studentSummaries = response.summaries || [];
  populateLectureSelect(currentLectures, studentSummaries);
  document.getElementById('summarySection').classList.remove('d-none');
  
  // عرض التلخيصات السابقة
  loadMySummaries(enteredEmail);
}

async function fetchLecturesWithDeviceCheck(email, deviceId) {
  if (!isValidEmail(email)) {
    return { error: "بريد إلكتروني غير صالح." };
  }

  const safeEmail = email.toLowerCase();
  const sanitizedDeviceId = deviceId || 'unknown-device';

  const userData = dataService.getUserDataByEmail(safeEmail);
  if (userData.error) {
    return { error: userData.error };
  }

  // تسجيل الجهاز
  const userDevices = dataService.registerDevice(safeEmail, sanitizedDeviceId);

  const maxDevicesAllowed = 3;
  if (userDevices.length > maxDevicesAllowed) {
    return { error: 'تم تجاوز الحد المسموح به للأجهزة.' };
  }

  const lectures = dataService.getLecturesByLevels(userData.levels);
  const summaries = dataService.getSummariesByEmail(safeEmail);
  const attachments = dataService.getAttachmentsData();

  return {
    studentName: userData.studentName || '',
    courseNumber: userData.courseNumber || '',
    lectures: lectures,
    summaries: summaries,
    attachments: attachments,
    studentEmail: safeEmail
  };
}

function populateLecturesTable(lectures) {
  const tableBody = document.getElementById('lecturesTableBody');
  tableBody.innerHTML = '';
  
  lectures.forEach(lecture => {
    const row = document.createElement('tr');
    const lectureNumber = lecture[0];
    
    row.innerHTML = `
      <td>${lectureNumber || ''}</td>
      <td>${lecture[1] || ''}</td>
      <td>${lecture[3] || ''}</td>
      <td>
        <button onclick="downloadLecture('${lectureNumber}')" class="btn btn-primary">
          <i class="fas fa-download"></i> تحميل
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  document.getElementById('lecturesTableSection').classList.remove('d-none');
}

function populateAttachments(lectures, allAttachments) {
  const attachmentsList = document.getElementById('attachmentsList');
  const attachmentsSection = document.getElementById('attachmentsSection');
  attachmentsList.innerHTML = '';

  let hasAttachmentsToShow = false;

  lectures.forEach(lecture => {
    const lectureNumber = lecture[0];
    const lectureName = lecture[1];

    allAttachments.forEach(attachment => {
      if (attachment.lectureNumber == lectureNumber && attachment.attachmentLink) {
        const attachmentDiv = document.createElement('div');
        attachmentDiv.className = 'attachment-item';
        attachmentDiv.innerHTML = `
          <div>
            <i class="fas fa-file-alt attachment-icon"></i>
            <strong>${lectureNumber} - ${lectureName}</strong>
          </div>
          <a href="${attachment.attachmentLink}" target="_blank" class="attachment-link">
            <i class="fas fa-download"></i> تحميل المرفق
          </a>
        `;
        attachmentsList.appendChild(attachmentDiv);
        hasAttachmentsToShow = true;
      }
    });
  });

  if (hasAttachmentsToShow) {
    attachmentsSection.classList.remove('d-none');
  } else {
    attachmentsSection.classList.add('d-none');
  }
}

function populateLectureSelect(lectures, summaries) {
  const lectureSelect = document.getElementById('lectureSelect');
  lectureSelect.innerHTML = '<option value="">-- اختر المحاضرة --</option>';

  const summarizedLectureNames = new Set((summaries || []).map(s => s.lecture));

  (lectures || []).forEach(lecture => {
    const lectureName = `${lecture[0]} - ${lecture[1]}`;
    if (!summarizedLectureNames.has(lectureName)) {
      const option = document.createElement('option');
      option.value = lectureName;
      option.textContent = lectureName;
      lectureSelect.appendChild(option);
    }
  });
}

async function submitSummary() {
  const email = document.getElementById('emailInput').value.trim();
  const summary = document.getElementById('lectureSummary').value.trim();
  const selectedLecture = document.getElementById('lectureSelect').value;
  const messageDiv = document.getElementById('summaryMessage');

  if (!email) {
    messageDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> يرجى إدخال البريد الإلكتروني.</div>';
    return;
  }

  if (!selectedLecture) {
    messageDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> يرجى اختيار المحاضرة.</div>';
    return;
  }

  if (!summary) {
    messageDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> يرجى كتابة التلخيص.</div>';
    return;
  }

  messageDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> جارٍ حفظ التلخيص...</div>';

  const response = await dataService.saveLectureSummary(email, selectedLecture, summary);

  if (response && response.success) {
    messageDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> تم حفظ التلخيص بنجاح.</div>';
    document.getElementById('lectureSummary').value = '';
    document.getElementById('lectureSelect').value = '';
    loadLectures();
  } else {
    messageDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> حدث خطأ أثناء الحفظ. ${(response && response.error) || ''}</div>`;
  }
}

async function loadMySummaries(email) {
  const container = document.getElementById('mySummariesList');
  const section = document.getElementById('mySummariesSection');
  container.innerHTML = '';

  const summaries = dataService.getSummariesByEmail(email);
  studentSummaries = summaries || [];

  if (!summaries || summaries.length === 0) {
    container.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> لم تقم بكتابة أي تلخيص بعد.</div>';
    section.classList.remove('d-none');
    return;
  }

  summaries.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'summary-box';
    div.style.marginBottom = '20px';

    div.innerHTML = `
      <h4><i class="fas fa-book"></i> ${item.lecture || ''}</h4>
      <p style="font-size: 1.2rem;"><strong><i class="fas fa-star"></i> العلامة من المشرف:</strong> 
        <span class="badge ${getMarkBadgeClass(item.mark)}" style="font-size: 1.2rem;">${item.mark || 'غير محددة'}</span>
      </p>
      <textarea id="summaryText${index}" class="summary-textarea" rows="4">${item.summary || ''}</textarea>
      <button onclick="saveEditedSummary(${item.row || 0}, 'summaryText${index}')" class="btn btn-warning mt-3">
        <i class="fas fa-save"></i> حفظ التعديل
      </button>
      <div id="saveMsg${index}" class="mt-2"></div>
    `;

    container.appendChild(div);
  });
  section.classList.remove('d-none');
}

function getMarkBadgeClass(mark) {
  if (!mark) return 'badge-primary';
  if (mark.includes('ممتاز')) return 'badge-success';
  if (mark.includes('جيد')) return 'badge-primary';
  if (mark.includes('مقبول')) return 'badge-warning';
  return 'badge-primary';
}

async function saveEditedSummary(rowNumber, textareaId) {
  const textarea = document.getElementById(textareaId);
  const newSummary = textarea.value.trim();
  const msgDiv = document.getElementById('saveMsg' + textareaId.replace('summaryText', ''));

  if (!newSummary) {
    msgDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> لا يمكن ترك التلخيص فارغاً.</div>';
    return;
  }

  msgDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> جاري الحفظ...</div>';

  const response = await dataService.updateSummary(rowNumber, newSummary);

  if (response && response.success) {
    msgDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> تم حفظ التلخيص بنجاح.</div>';
  } else {
    msgDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> حدث خطأ أثناء الحفظ. ${(response && response.error) || ''}</div>`;
  }
}

function displaySelectedLectureDetails() {
  const lectureSelect = document.getElementById('lectureSelect');
  const selectedValue = lectureSelect.value;
  const detailsDiv = document.getElementById('selectedLectureDetails');
  const warningDiv = document.getElementById('summaryWarning');

  const displayLectureNumber = document.getElementById('displayLectureNumber');
  const displayLectureName = document.getElementById('displayLectureName');
  const displayLecturerName = document.getElementById('displayLecturerName');
  const displaySummaryPoints = document.getElementById('displaySummaryPoints');

  if (selectedValue === "") {
    detailsDiv.classList.add('d-none');
    warningDiv.classList.add('d-none');
    displayLectureNumber.textContent = '';
    displayLectureName.textContent = '';
    displayLecturerName.textContent = '';
    displaySummaryPoints.textContent = '';
  } else {
    const response = dataService.getLectureDetailsForSummary(selectedValue);

    if (response && response.success) {
      displayLectureNumber.textContent = response.lectureNumber || '';
      displayLectureName.textContent = response.lectureName || '';
      displayLecturerName.textContent = response.lecturerName || '';
      displaySummaryPoints.textContent = response.summaryPoints || '';
      detailsDiv.classList.remove('d-none');
      warningDiv.classList.remove('d-none');
    } else {
      detailsDiv.classList.add('d-none');
      warningDiv.classList.add('d-none');
      alert(response.error || 'حدث خطأ أثناء جلب تفاصيل المحاضرة.');
    }
  }
}

function downloadLecture(lectureNumber) {
  const resultArea = document.getElementById('resultArea');
  resultArea.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin"></i> جاري جلب رابط المحاضرة...
    </div>
  `;

  if (!lectureNumber) {
    resultArea.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle"></i> رقم المحاضرة غير صالح
      </div>
    `;
    return;
  }

  const response = dataService.getLectureUrlByNumber(lectureNumber);
  
  if (response && response.url) {
    if (response.url === '#') {
      resultArea.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-circle"></i> لا يوجد رابط تحميل متاح لهذه المحاضرة
        </div>
      `;
    } else {
      // فتح رابط التحميل في نافذة جديدة
      window.open(response.url, '_blank');
      resultArea.innerHTML = '';
    }
  } else {
    resultArea.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle"></i> 
        ${response.error || 'حدث خطأ أثناء جلب رابط المحاضرة'}
      </div>
    `;
  }
}