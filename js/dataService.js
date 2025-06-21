class DataService {
  constructor() {
    this.accounts = [];
    this.lectures = [];
    this.devices = [];
    this.summaries = [];
    this.loadData();
  }

  async loadData() {
    try {
      const responses = await Promise.all([
        this.fetchData('data/accounts.json'),
        this.fetchData('data/lectures.json'),
        this.fetchData('data/devices.json'),
        this.fetchData('data/summaries.json')
      ]);
      
      this.accounts = responses[0] || [];
      this.lectures = responses[1] || [];
      this.devices = responses[2] || [];
      this.summaries = responses[3] || [];
      
      // تحميل أي بيانات محفوظة محلياً
      this.loadLocalData();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return await response.json();
  }

  loadLocalData() {
    // تحميل التلخيصات من localStorage إذا وجدت
    const localSummaries = localStorage.getItem('lectureSummaries');
    if (localSummaries) {
      this.summaries = JSON.parse(localSummaries);
    }
    
    // تحميل بيانات الأجهزة من localStorage
    const localDevices = localStorage.getItem('userDevices');
    if (localDevices) {
      this.devices = JSON.parse(localDevices);
    }
  }

  getUserDataByEmail(email) {
    const user = this.accounts.find(acc => 
      acc['البريد الالكتروني'] && acc['البريد الالكتروني'].toLowerCase() === email.toLowerCase()
    );
    
    if (!user) {
      return { error: 'البريد الإلكتروني غير مسجل.' };
    }
    
    return {
      studentEmail: email,
      courseNumber: user['رقم الدورة'] || '',
      studentName: user['اسم الطالب'] || '',
      levels: {
        1: user['المستوى 1'] || 0,
        2: user['المستوى 2'] || 0,
        3: user['المستوى 3'] || 0,
        4: user['المستوى 4'] || 0,
        5: user['المستوى 5'] || 0,
        6: user['المستوى 6'] || 0,
        7: user['المستوى 7'] || 0,
        8: user['الامتحان الكتابي الأول'] || 0,
        9: user['امتحان تشخيص الحالة'] || 0,
        10: user['الامتحان الشفهي'] || 0
      }
    };
  }

  getLecturesByLevels(levels) {
    const levelMap = {
      1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع',
      5: 'الخامس', 6: 'السادس', 7: 'السابع',
      8: 'الامتحان الكتابي الأول',
      9: 'امتحان تشخيص الحالة',
      10: 'الامتحان الشفهي'
    };

    const levelNamesAllowed = [];
    for (let i = 1; i <= 10; i++) {
      if (levels[i] == 1) {
        levelNamesAllowed.push(levelMap[i]);
      }
    }

    return this.lectures
      .filter(lecture => levelNamesAllowed.includes(lecture['المستوى']))
      .map(lecture => [
        lecture['رقم المحاضرة'] || '',
        lecture['اسم المحاضرة'] || '',
        lecture['الرابط'] || '#',
        lecture['المستوى'] || ''
      ]);
  }

  getSummariesByEmail(email) {
    return this.summaries
      .filter(summary => 
        summary['البريد الإلكتروني'] && 
        summary['البريد الإلكتروني'].toLowerCase() === email.toLowerCase()
      )
      .map((summary, index) => ({
        row: index + 2, // لأن الصف الأول هو العناوين
        lecture: summary['المحاضرة'] || '',
        summary: summary['التلخيص'] || '',
        mark: summary['العلامة'] || 'غير محددة'
      }));
  }

  saveLectureSummary(email, lectureName, summaryText) {
    const newSummary = {
      'التاريخ': new Date().toISOString(),
      'البريد الإلكتروني': email,
      'المحاضرة': lectureName,
      'التلخيص': summaryText,
      'العلامة': 'غير محددة'
    };
    
    this.summaries.push(newSummary);
    this.saveSummaries();
    return { success: true };
  }

  updateSummary(rowNumber, newSummaryText) {
    if (rowNumber >= 2 && rowNumber <= this.summaries.length + 1) {
      this.summaries[rowNumber - 2]['التلخيص'] = newSummaryText;
      this.saveSummaries();
      return { success: true };
    }
    return { success: false, error: "رقم الصف غير صالح" };
  }

  getLectureDetailsForSummary(selectedValue) {
    const parts = selectedValue.split(' - ', 2);
    let lectureNumber = "";
    let lectureName = "";

    if (parts.length === 2) {
      lectureNumber = parts[0];
      lectureName = parts[1];
    } else {
      lectureName = selectedValue;
    }

    const lecture = this.lectures.find(lec => 
      (lectureNumber && lec['رقم المحاضرة'] === lectureNumber && 
       lec['اسم المحاضرة'] === lectureName) ||
      (!lectureNumber && lec['اسم المحاضرة'] === lectureName)
    );

    if (!lecture) {
      return { success: false, error: "لم يتم العثور على تفاصيل المحاضرة." };
    }

    return {
      success: true,
      lectureNumber: lecture['رقم المحاضرة'] || '',
      lectureName: lecture['اسم المحاضرة'] || '',
      lecturerName: lecture['اسم الشيخ المحاضر'] || '',
      summaryPoints: lecture['عدد نقاط التلخيص'] || ''
    };
  }

  getLectureUrlByNumber(lectureNumber) {
    const lecture = this.lectures.find(
      lec => lec['رقم المحاضرة'] == lectureNumber
    );
    
    return lecture ? { url: lecture['الرابط'] || '#' } : { url: '#', error: "لم يتم العثور على المحاضرة" };
  }

  getAttachmentsData() {
    return this.lectures
      .filter(lecture => lecture['المرفقات'])
      .map(lecture => ({
        lectureNumber: lecture['رقم المحاضرة'],
        lectureName: lecture['اسم المحاضرة'],
        attachmentLink: lecture['المرفقات']
      }));
  }

  saveSummaries() {
    localStorage.setItem('lectureSummaries', JSON.stringify(this.summaries));
  }

  registerDevice(email, deviceId) {
    const existingDevice = this.devices.find(
      device => device.email === email && device.deviceId === deviceId
    );

    if (!existingDevice) {
      this.devices.push({
        email,
        deviceId,
        lastAccess: new Date().toISOString()
      });
      localStorage.setItem('userDevices', JSON.stringify(this.devices));
    }
    
    return this.devices.filter(device => device.email === email);
  }
}

// إنشاء نسخة واحدة من خدمة البيانات
const dataService = new DataService();