(() => {
    'use strict';
    // Grade mapping for IPU
    const gradeMapping = {
      'O': 10,
      'A+': 9,
      'A': 8,
      'B+': 7,
      'B': 6,
      'C': 5,
      'P': 4,
      'F': 0
    };
  
    // DOM Elements
    const subjectsContainer = document.getElementById('ipu-cgpa-calc-subjects');
    const semestersContainer = document.getElementById('ipu-cgpa-calc-semesters');
    const sgpaResultDiv = document.getElementById('ipu-cgpa-calc-sgpa-result');
    const cgpaResultDiv = document.getElementById('ipu-cgpa-calc-cgpa-result');
    const actionsDiv = document.getElementById('ipu-cgpa-calc-actions');
    const addSubjectBtn = document.getElementById('ipu-cgpa-calc-add-subject');
    const calcSgpaBtn = document.getElementById('ipu-cgpa-calc-calc-sgpa');
    const addSemesterBtn = document.getElementById('ipu-cgpa-calc-add-semester');
    const calcCgpaBtn = document.getElementById('ipu-cgpa-calc-calc-cgpa');
    const downloadPdfBtn = document.getElementById('ipu-cgpa-calc-download-pdf');
    const copyBtn = document.getElementById('ipu-cgpa-calc-copy');
    const resetBtn = document.getElementById('ipu-cgpa-calc-reset');
  
    // State representation
    let state = {
      subjects: [], // { credit: number, grade: string }
      sgpaResult: null, // { sgpa: number, totalCredits: number, totalPoints: number, breakdown: [] }
      semesters: [], // { sgpa: number, credits: number }
      cgpaResult: null // { cgpa: number, percentage: number, totalCredits: number, weightedSum: number, division: string, breakdown: [] }
    };
  
    // Utility function to round to 2 decimals
    function roundTwo(num) {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }
  
    /**
     * Create a new subject row in the SGPA calculator.
     * @param {Object} data Optional preloaded data {credit, grade}
     */
    function createSubjectRow(data = {}) {
      const row = document.createElement('div');
      row.classList.add('ipu-cgpa-calc-row');
  
      // Credit input
      const creditInput = document.createElement('input');
      creditInput.type = 'number';
      creditInput.min = '0';
      creditInput.step = '1';
      creditInput.placeholder = 'Credits';
      creditInput.classList.add("st-general-input");
      creditInput.value = data.credit != null ? data.credit : '';
      creditInput.addEventListener('input', saveState);
  
      // Grade select
      const gradeSelect = document.createElement('select');
      gradeSelect.classList.add("st-general-select");
      const gradeOptions = ['','O','A+','A','B+','B','C','P','F'];
      gradeOptions.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g === '' ? 'Grade' : g;
        if (data.grade === g) opt.selected = true;
        gradeSelect.appendChild(opt);
      });
      gradeSelect.addEventListener('change', saveState);
  
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = `<i class="fa-solid fa-trash-arrow-up"></i>`;
      removeBtn.title = 'Remove subject';
      removeBtn.classList.add("ipu-cgpa-calc-remove-btn");
      removeBtn.addEventListener('click', () => {
        subjectsContainer.removeChild(row);
        saveState();
      });
  
      row.appendChild(creditInput);
      row.appendChild(gradeSelect);
      row.appendChild(removeBtn);
      subjectsContainer.appendChild(row);
    }
  
    /**
     * Create a new semester row in the CGPA calculator.
     * @param {Object} data Optional preloaded data {sgpa, credits}
     */
    function createSemesterRow(data = {}) {
      const row = document.createElement('div');
      row.classList.add('ipu-cgpa-calc-row');
  
      // SGPA input
      const sgpaInput = document.createElement('input');
      sgpaInput.type = 'number';
      sgpaInput.min = '0';
      sgpaInput.max = '10';
      sgpaInput.step = '0.01';
      sgpaInput.placeholder = 'SGPA';
      sgpaInput.classList.add("st-general-input");
      sgpaInput.value = data.sgpa != null ? data.sgpa : '';
      sgpaInput.addEventListener('input', saveState);
  
      // Credits input
      const creditInput = document.createElement('input');
      creditInput.type = 'number';
      creditInput.min = '0';
      creditInput.step = '1';
      creditInput.placeholder = 'Credits';
      creditInput.classList.add("st-general-input");
      creditInput.value = data.credits != null ? data.credits : '';
      creditInput.addEventListener('input', saveState);
  
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = `<i class="fa-solid fa-trash-arrow-up"></i>`;
      removeBtn.title = 'Remove semester';
      removeBtn.classList.add("ipu-cgpa-calc-remove-btn");
      removeBtn.addEventListener('click', () => {
        semestersContainer.removeChild(row);
        saveState();
      });
  
      row.appendChild(sgpaInput);
      row.appendChild(creditInput);
      row.appendChild(removeBtn);
      semestersContainer.appendChild(row);
    }
  
    /**
     * Compute SGPA based on subject rows.
     */
    function calculateSgpa() {
      const rows = Array.from(subjectsContainer.children);
      if (rows.length === 0) {
        alert('Please add at least one subject.');
        return;
      }
      let totalCredits = 0;
      let totalGradePoints = 0;
      const breakdown = [];
      // Validate each row
      for (const row of rows) {
        const credit = parseFloat(row.children[0].value);
        const grade = row.children[1].value;
        if (isNaN(credit) || credit <= 0) {
          alert('Please enter valid credits for all subjects.');
          return;
        }
        if (!grade || !(grade in gradeMapping)) {
          alert('Please select a valid grade for all subjects.');
          return;
        }
        const gradePoint = gradeMapping[grade];
        totalCredits += credit;
        totalGradePoints += gradePoint * credit;
        breakdown.push({ credit, grade, gradePoint, weighted: gradePoint * credit });
      }
      if (totalCredits === 0) {
        alert('Total credits cannot be zero.');
        return;
      }
      const sgpa = roundTwo(totalGradePoints / totalCredits);
      state.sgpaResult = { sgpa, totalCredits, totalPoints: totalGradePoints, breakdown };
      saveState();
      displaySgpaResult();
      showActions();
    }
  
    /**
     * Compute CGPA based on semester rows.
     */
    function calculateCgpa() {
      const rows = Array.from(semestersContainer.children);
      if (rows.length === 0) {
        alert('Please add at least one semester.');
        return;
      }
      let totalCredits = 0;
      let weightedSum = 0;
      const breakdown = [];
      for (const row of rows) {
        const sgpa = parseFloat(row.children[0].value);
        const credits = parseFloat(row.children[1].value);
        if (isNaN(sgpa) || sgpa < 0 || sgpa > 10) {
          alert('Please enter valid SGPA values between 0 and 10 for all semesters.');
          return;
        }
        if (isNaN(credits) || credits <= 0) {
          alert('Please enter valid credits for all semesters.');
          return;
        }
        totalCredits += credits;
        weightedSum += sgpa * credits;
        breakdown.push({ sgpa, credits, weighted: sgpa * credits });
      }
      if (totalCredits === 0) {
        alert('Total credits cannot be zero.');
        return;
      }
      const cgpa = roundTwo(weightedSum / totalCredits);
      const percentage = roundTwo(cgpa * 10);
      // Division classification
      let division;
      if (cgpa >= 6.5) {
        division = 'First Division';
      } else if (cgpa >= 5.0) {
        division = 'Second Division';
      } else if (cgpa >= 4.0) {
        division = 'Third Division';
      } else {
        division = 'Fail';
      }
      state.cgpaResult = { cgpa, percentage, totalCredits, weightedSum, division, breakdown };
      saveState();
      displayCgpaResult();
      showActions();
    }
  
    /**
     * Display SGPA results in the UI.
     */
    function displaySgpaResult() {
      const res = state.sgpaResult;
      if (!res) return;
      let html = '';
      html += `<p><strong>SGPA:</strong> ${res.sgpa}</p>`;
      html += `<p><strong>Total Credits:</strong> ${res.totalCredits}</p>`;
      html += `<p><strong>Total Grade Points:</strong> ${roundTwo(res.totalPoints)}</p>`;
      // Build breakdown table
      html += '<table><thead><tr><th>Subject</th><th>Credits</th><th>Grade</th><th>Grade Point</th><th>Weighted</th></tr></thead><tbody>';
      res.breakdown.forEach((item, idx) => {
        html += `<tr><td>${idx + 1}</td><td>${item.credit}</td><td>${item.grade}</td><td>${item.gradePoint}</td><td>${item.weighted}</td></tr>`;
      });
      html += '</tbody></table>';
      sgpaResultDiv.innerHTML = html;
      sgpaResultDiv.style.display = 'block';
    }
  
    /**
     * Display CGPA results in the UI.
     */
    function displayCgpaResult() {
      const res = state.cgpaResult;
      if (!res) return;
      let html = '';
      html += `<p><strong>CGPA:</strong> ${res.cgpa}</p>`;
      html += `<p><strong>Total Credits:</strong> ${res.totalCredits}</p>`;
      html += `<p><strong>Weighted Sum:</strong> ${roundTwo(res.weightedSum)}</p>`;
      html += `<p><strong>Percentage:</strong> ${res.percentage}%</p>`;
      html += `<p><strong>Division:</strong> ${res.division}</p>`;
      // Build breakdown table
      html += '<table><thead><tr><th>Semester</th><th>SGPA</th><th>Credits</th><th>Weighted</th></tr></thead><tbody>';
      res.breakdown.forEach((item, idx) => {
        html += `<tr><td>${idx + 1}</td><td>${item.sgpa}</td><td>${item.credits}</td><td>${roundTwo(item.weighted)}</td></tr>`;
      });
      html += '</tbody></table>';
      cgpaResultDiv.innerHTML = html;
      cgpaResultDiv.style.display = 'block';
    }
  
    /**
     * Show action buttons after calculation.
     */
    function showActions() {
      actionsDiv.style.display = 'flex';
    }
  
    /**
     * Hide results and actions.
     */
    function hideResults() {
      sgpaResultDiv.style.display = 'none';
      cgpaResultDiv.style.display = 'none';
      actionsDiv.style.display = 'none';
    }
  
    /**
     * Save current state to sessionStorage.
     */
    function saveState() {
      // Build subjects array
      const subjects = Array.from(subjectsContainer.children).map(row => {
        return {
          credit: row.children[0].value ? parseFloat(row.children[0].value) : '',
          grade: row.children[1].value || ''
        };
      });
      // Build semesters array
      const semesters = Array.from(semestersContainer.children).map(row => {
        return {
          sgpa: row.children[0].value ? parseFloat(row.children[0].value) : '',
          credits: row.children[1].value ? parseFloat(row.children[1].value) : ''
        };
      });
      state.subjects = subjects;
      state.semesters = semesters;
      sessionStorage.setItem('ipuCgpaCalcState', JSON.stringify(state));
    }
  
    /**
     * Load state from sessionStorage and rebuild UI.
     */
    function loadState() {
      const raw = sessionStorage.getItem('ipuCgpaCalcState');
      if (!raw) {
        // Initialize with a default row in each section
        createSubjectRow();
        createSemesterRow();
        return;
      }
      try {
        state = JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing state', e);
      }
      // Rebuild subjects
      subjectsContainer.innerHTML = '';
      if (state.subjects && state.subjects.length) {
        state.subjects.forEach(item => createSubjectRow(item));
      } else {
        createSubjectRow();
      }
      // Rebuild semesters
      semestersContainer.innerHTML = '';
      if (state.semesters && state.semesters.length) {
        state.semesters.forEach(item => createSemesterRow(item));
      } else {
        createSemesterRow();
      }
      // Display previous results if any
      if (state.sgpaResult) {
        displaySgpaResult();
      }
      if (state.cgpaResult) {
        displayCgpaResult();
      }
      if (state.sgpaResult || state.cgpaResult) {
        showActions();
      }
    }
  
    /**
     * Generate a plain-text summary of results for copy/PDF.
     */
    function generateSummary() {
      let summary = 'IPU CGPA & SGPA Calculation Results\n\n';
      if (state.sgpaResult) {
        const res = state.sgpaResult;
        summary += '--- SGPA Result ---\n';
        summary += `SGPA: ${res.sgpa}\n`;
        summary += `Total Credits: ${res.totalCredits}\n`;
        summary += `Total Grade Points: ${roundTwo(res.totalPoints)}\n`;
        summary += 'Breakdown:\n';
        res.breakdown.forEach((item, idx) => {
          summary += `Subject ${idx + 1}: Credits ${item.credit}, Grade ${item.grade}, Grade Point ${item.gradePoint}, Weighted ${item.weighted}\n`;
        });
        summary += '\n';
      }
      if (state.cgpaResult) {
        const res = state.cgpaResult;
        summary += '--- CGPA Result ---\n';
        summary += `CGPA: ${res.cgpa}\n`;
        summary += `Total Credits: ${res.totalCredits}\n`;
        summary += `Weighted Sum: ${roundTwo(res.weightedSum)}\n`;
        summary += `Percentage: ${res.percentage}%\n`;
        summary += `Division: ${res.division}\n`;
        summary += 'Breakdown:\n';
        res.breakdown.forEach((item, idx) => {
          summary += `Semester ${idx + 1}: SGPA ${item.sgpa}, Credits ${item.credits}, Weighted ${roundTwo(item.weighted)}\n`;
        });
        summary += '\n';
      }
      return summary;
    }
  
    /**
     * Generate a PDF file and download it.
     */
    function downloadPdf() {
      const summary = generateSummary();
      if (!summary.trim()) {
        alert('Nothing to export. Please calculate SGPA or CGPA first.');
        return;
      }
      // Use jsPDF from global namespace
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(summary, 180);
      doc.setFontSize(12);
      doc.text(lines, 10, 20);
      doc.save('ipu_cgpa_result.pdf');
    }
  
    /**
     * Copy result summary to clipboard.
     */
    function copyResult() {
      const summary = generateSummary();
      if (!summary.trim()) {
        alert('Nothing to copy. Please calculate SGPA or CGPA first.');
        return;
      }
      navigator.clipboard.writeText(summary).then(() => {
        alert('Result copied to clipboard!');
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  
    /**
     * Reset the calculator to initial state.
     */
    function resetCalculator() {
      if (!confirm('This will clear all inputs and results. Continue?')) return;
      // Clear state
      state = {
        subjects: [],
        sgpaResult: null,
        semesters: [],
        cgpaResult: null
      };
      sessionStorage.removeItem('ipuCgpaCalcState');
      // Clear DOM
      subjectsContainer.innerHTML = '';
      semestersContainer.innerHTML = '';
      hideResults();
      // Add one default row each
      createSubjectRow();
      createSemesterRow();
    }
  
    // Event Listeners
    addSubjectBtn.addEventListener('click', () => {
      createSubjectRow();
      saveState();
    });
    calcSgpaBtn.addEventListener('click', calculateSgpa);
    addSemesterBtn.addEventListener('click', () => {
      createSemesterRow();
      saveState();
    });
    calcCgpaBtn.addEventListener('click', calculateCgpa);
    downloadPdfBtn.addEventListener('click', downloadPdf);
    copyBtn.addEventListener('click', copyResult);
    resetBtn.addEventListener('click', resetCalculator);
  
    // Initialize page
    loadState();
  })();
