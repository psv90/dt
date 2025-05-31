// Global variables
let currentCapital = 300;
let initialCapitalAmount = 300;
let entries = [];
let currentDayId = null;
let editingDayId = null;
let editingDescriptionId = null;
let editingDescriptionDayId = null;
let clipboardImage = null;
let currentPage = 1;
const entriesPerPage = 10;

// Clipboard image handling
function handlePaste(event) {
    const items = event.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            clipboardImage = blob;
            
            const modal = event.target.closest('.modal');
            if (modal) {
                const fileInput = modal.querySelector('input[type="file"]');
                if (fileInput) {
                    const container = fileInput.parentNode;
                    let pasteInfo = container.querySelector('.paste-info');
                    if (!pasteInfo) {
                        pasteInfo = document.createElement('div');
                        pasteInfo.className = 'paste-info';
                        pasteInfo.style.cssText = 'margin-top: 3px; font-size: 10px; color: #4CAF50; font-weight: bold;';
                        container.appendChild(pasteInfo);
                    }
                    pasteInfo.textContent = '✓ Obraz wklejony ze schowka';
                }
            }
            
            event.preventDefault();
            break;
        }
    }
}

function addPasteListeners() {
    const addDescModal = document.getElementById('addDescModal');
    const editDescModal = document.getElementById('editDescModal');
    if (addDescModal) addDescModal.addEventListener('paste', handlePaste);
    if (editDescModal) editDescModal.addEventListener('paste', handlePaste);
}

// localStorage functions
function saveToLocalStorage() {
    const expandedStates = {};
    entries.forEach(entry => {
        const contentElement = document.getElementById(`entry-content-${entry.id}`);
        if (contentElement) {
            expandedStates[entry.id] = contentElement.classList.contains('expanded');
        }
    });
    
    const filtersSection = document.getElementById('filtersSection');
    const filterSettings = {
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value,
        setupFilter: document.getElementById('setupFilter').value,
        quickDateFilter: document.getElementById('quickDateFilter').value,
        filtersVisible: filtersSection.classList.contains('visible'),
        currentPage: currentPage,
        initialCapital: initialCapitalAmount
    };
    
    const data = {
        currentCapital: currentCapital,
        entries: entries,
        expandedStates: expandedStates,
        filterSettings: filterSettings,
        initialCapital: initialCapitalAmount
    };
    localStorage.setItem('traderDiary', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('traderDiary') || '{}');
    currentCapital = data.currentCapital || 300;
    initialCapitalAmount = data.initialCapital || 300;
    entries = data.entries || [];
    
    // Ustaw wartość kapitału początkowego w polu
    document.getElementById('initialCapital').value = initialCapitalAmount;
    
    if (data.filterSettings) {
        if (data.filterSettings.dateFrom) {
            document.getElementById('dateFrom').value = data.filterSettings.dateFrom;
        }
        if (data.filterSettings.dateTo) {
            document.getElementById('dateTo').value = data.filterSettings.dateTo;
        }
        if (data.filterSettings.setupFilter) {
            document.getElementById('setupFilter').value = data.filterSettings.setupFilter;
        }
        if (data.filterSettings.quickDateFilter) {
            document.getElementById('quickDateFilter').value = data.filterSettings.quickDateFilter;
        }
        if (data.filterSettings.initialCapital) {
            initialCapitalAmount = data.filterSettings.initialCapital;
            document.getElementById('initialCapital').value = initialCapitalAmount;
        }
        
        // Przywróć stronę, ale upewnij się że nie przekracza dostępnych stron
        if (data.filterSettings.currentPage) {
            const totalPages = Math.ceil(entries.length / entriesPerPage);
            currentPage = Math.min(data.filterSettings.currentPage, Math.max(1, totalPages));
        }
        
        if (data.filterSettings.filtersVisible) {
            document.getElementById('filtersSection').classList.add('visible');
            document.getElementById('filtersToggle').classList.add('active');
        }
        
        if (data.filterSettings.dateFrom || data.filterSettings.dateTo || data.filterSettings.setupFilter || data.filterSettings.quickDateFilter) {
            setTimeout(() => {
                applyFilters();
            }, 100);
        }
    }
    
    setTimeout(() => {
        if (data.expandedStates) {
            Object.keys(data.expandedStates).forEach(entryId => {
                if (data.expandedStates[entryId]) {
                    const contentElement = document.getElementById(`entry-content-${entryId}`);
                    if (contentElement) {
                        contentElement.classList.add('expanded');
                    }
                }
            });
        }
    }, 200);
}

// Navigation
function openRulesPage() {
    window.location.href = 'zasady_setupy_updated.html';
}

function openStatistics() {
    window.location.href = 'statystyki_updated.html';
}

// Toggle filters
function toggleFilters() {
    const filtersSection = document.getElementById('filtersSection');
    const toggleButton = document.getElementById('filtersToggle');
    
    if (filtersSection.classList.contains('visible')) {
        filtersSection.classList.remove('visible');
        toggleButton.classList.remove('active');
    } else {
        filtersSection.classList.add('visible');
        toggleButton.classList.add('active');
    }
    
    saveToLocalStorage();
}

// Export/Import functions
function exportData() {
    const data = {
        currentCapital: currentCapital,
        entries: entries,
        exportDate: new Date().toISOString(),
        version: "1.0"
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `trader_diary_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        alert('Proszę wybrać plik JSON');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.entries || !Array.isArray(importedData.entries)) {
                throw new Error('Nieprawidłowa struktura danych');
            }
            
            const confirmMessage = `
Znaleziono ${importedData.entries.length} wpisów.
Data eksportu: ${importedData.exportDate ? new Date(importedData.exportDate).toLocaleString('pl-PL') : 'Nieznana'}

UWAGA: Import zastąpi wszystkie obecne dane!

Czy chcesz kontynuować?`;
            
            if (confirm(confirmMessage)) {
                currentCapital = importedData.currentCapital || 300;
                entries = importedData.entries || [];
                
                saveToLocalStorage();
                renderEntries();
                
                alert(`Import zakończony pomyślnie!\nZaimportowano ${entries.length} wpisów.`);
            }
            
        } catch (error) {
            alert(`Błąd podczas importu: ${error.message}\n\nUpewnij się, że wybrałeś prawidłowy plik z danymi dziennika tradera.`);
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// Filter functions
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Poniedziałek jako początek tygodnia
    return new Date(d.setDate(diff));
}

function getWeekEnd(date) {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
}

function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function applyQuickDateFilter() {
    const quickFilter = document.getElementById('quickDateFilter').value;
    const today = new Date();
    let dateFrom = null;
    let dateTo = null;
    
    switch (quickFilter) {
        case 'thisWeek':
            dateFrom = getWeekStart(today);
            dateTo = getWeekEnd(today);
            break;
            
        case 'lastWeek':
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            dateFrom = getWeekStart(lastWeek);
            dateTo = getWeekEnd(lastWeek);
            break;
            
        case 'thisMonth':
            dateFrom = getMonthStart(today);
            dateTo = getMonthEnd(today);
            break;
            
        case 'lastMonth':
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            dateFrom = getMonthStart(lastMonth);
            dateTo = getMonthEnd(lastMonth);
            break;
            
        case 'last7days':
            dateTo = new Date(today);
            dateFrom = new Date(today);
            dateFrom.setDate(today.getDate() - 6);
            break;
            
        case 'last30days':
            dateTo = new Date(today);
            dateFrom = new Date(today);
            dateFrom.setDate(today.getDate() - 29);
            break;
            
        case 'thisYear':
            dateFrom = new Date(today.getFullYear(), 0, 1);
            dateTo = new Date(today.getFullYear(), 11, 31);
            break;
            
        default:
            // Wyczyść filtry dat jeśli nie wybrano opcji
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            applyFilters();
            return;
    }
    
    // Ustaw daty w polach
    if (dateFrom && dateTo) {
        document.getElementById('dateFrom').value = formatDateForInput(dateFrom);
        document.getElementById('dateTo').value = formatDateForInput(dateTo);
    }
    
    // Zastosuj filtry
    applyFilters();
}

function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const setupFilter = document.getElementById('setupFilter').value;
    
    // Resetuj stronę do pierwszej przy zmianie filtrów
    currentPage = 1;
    
    saveToLocalStorage();
    
    let entriesToShow = [...entries];
    
    if (dateFrom || dateTo || setupFilter) {
        entriesToShow = entries.filter(entry => {
            // Date filtering for all entries
            if (dateFrom || dateTo) {
                let entryDateFrom, entryDateTo;
                
                if (entry.type === 'day') {
                    if (!entry.date) return false;
                    entryDateFrom = entryDateTo = new Date(entry.date);
                } else if (entry.type === 'weekly') {
                    if (!entry.dateFrom || !entry.dateTo) return false;
                    entryDateFrom = new Date(entry.dateFrom);
                    entryDateTo = new Date(entry.dateTo);
                }
                
                if (dateFrom) {
                    const filterFromDate = new Date(dateFrom);
                    if (entryDateTo < filterFromDate) return false;
                }
                
                if (dateTo) {
                    const filterToDate = new Date(dateTo);
                    if (entryDateFrom > filterToDate) return false;
                }
            }
            
            // Setup filtering (only for day entries)
            if (setupFilter && entry.type === 'day') {
                if (!entry.setupAnalysis) return false;
                if (!entry.setupAnalysis[setupFilter]) return false;
            }
            
            return true;
        });
        
        showFilterStatus(dateFrom, dateTo, setupFilter, entriesToShow.length);
    } else {
        hideFilterStatus();
    }
    
    renderFilteredEntries(entriesToShow);
}

function clearDateFilter() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('quickDateFilter').value = '';
    applyFilters();
}

function clearAllFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('setupFilter').value = '';
    document.getElementById('quickDateFilter').value = '';
    hideFilterStatus();
    renderFilteredEntries(entries);
    saveToLocalStorage();
}

function showFilterStatus(dateFrom, dateTo, setupFilter, count) {
    hideFilterStatus();
    
    const filters = [];
    const quickFilter = document.getElementById('quickDateFilter').value;
    
    // Jeśli używamy szybkiego filtra, pokaż jego nazwę zamiast dat
    if (quickFilter) {
        const quickFilterNames = {
            'thisWeek': 'Ten tydzień',
            'lastWeek': 'Poprzedni tydzień',
            'thisMonth': 'Ten miesiąc',
            'lastMonth': 'Poprzedni miesiąc',
            'last7days': 'Ostatnie 7 dni',
            'last30days': 'Ostatnie 30 dni',
            'thisYear': 'Ten rok'
        };
        filters.push(`📅 ${quickFilterNames[quickFilter]}`);
    } else if (dateFrom || dateTo) {
        const fromText = dateFrom ? new Date(dateFrom).toLocaleDateString('pl-PL') : 'początek';
        const toText = dateTo ? new Date(dateTo).toLocaleDateString('pl-PL') : 'koniec';
        filters.push(`📅 ${fromText} - ${toText}`);
    }
    
    if (setupFilter) {
        const setupNumber = setupFilter.replace('setup', '');
        filters.push(`🎯 Setup nr. ${setupNumber}`);
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'filter-status';
    statusDiv.id = 'filterStatus';
    statusDiv.innerHTML = `Filtr aktywny: ${filters.join(' + ')} (${count} wpisów)`;
    
    const entriesList = document.getElementById('entriesList');
    entriesList.insertBefore(statusDiv, entriesList.firstChild);
}

function hideFilterStatus() {
    const existingStatus = document.getElementById('filterStatus');
    if (existingStatus) {
        existingStatus.remove();
    }
}

// Modal functions
function showAddDayModal() {
    document.getElementById('addDayModal').style.display = 'block';
}

function hideAddDayModal() {
    document.getElementById('addDayModal').style.display = 'none';
    document.getElementById('dayDate').value = '';
    document.getElementById('dayAmount').value = '';
    document.getElementById('calendarCheck').checked = false;
    
    // Reset box analysis
    document.getElementById('grayBounce').value = 0;
    document.getElementById('grayBreak').value = 0;
    document.getElementById('greenBounce').value = 0;
    document.getElementById('greenBreak').value = 0;
    document.getElementById('redBounce').value = 0;
    document.getElementById('redBreak').value = 0;
    
    // Reset setups
    document.getElementById('setup1').checked = false;
    document.getElementById('setup2').checked = false;
    document.getElementById('setup3').checked = false;
    document.getElementById('setup4').checked = false;
    document.getElementById('setup5').checked = false;
    document.getElementById('setup6').checked = false;
}

function showAddWeeklyModal() {
    document.getElementById('addWeeklyModal').style.display = 'block';
    // Dodaj event listenery dla automatycznego obliczania
    document.getElementById('weeklyDateFrom').addEventListener('change', calculateWeeklyAmount);
    document.getElementById('weeklyDateTo').addEventListener('change', calculateWeeklyAmount);
}

function hideAddWeeklyModal() {
    document.getElementById('addWeeklyModal').style.display = 'none';
    document.getElementById('weeklyDateFrom').value = '';
    document.getElementById('weeklyDateTo').value = '';
    document.getElementById('weeklyAmount').value = '';
    document.getElementById('weeklyImprove').value = '';
    document.getElementById('weeklyGood').value = '';
    
    // Usuń event listenery
    document.getElementById('weeklyDateFrom').removeEventListener('change', calculateWeeklyAmount);
    document.getElementById('weeklyDateTo').removeEventListener('change', calculateWeeklyAmount);
    
    // Usuń informację o obliczeniu
    const calculationInfo = document.getElementById('weeklyCalculationInfo');
    if (calculationInfo) {
        calculationInfo.remove();
    }
}

function showAddDescModal(dayId) {
    currentDayId = dayId;
    document.getElementById('addDescModal').style.display = 'block';
}

function hideAddDescModal() {
    document.getElementById('addDescModal').style.display = 'none';
    document.getElementById('descHour').value = '';
    document.getElementById('descText').value = '';
    document.getElementById('descErrors').value = '';
    document.getElementById('descScreenshot').value = '';
    
    const pasteInfo = document.querySelector('#addDescModal .paste-info');
    if (pasteInfo) pasteInfo.remove();
    clipboardImage = null;
    
    currentDayId = null;
}

function hideEditDescModal() {
    document.getElementById('editDescModal').style.display = 'none';
    document.getElementById('editDescHour').value = '';
    document.getElementById('editDescText').value = '';
    document.getElementById('editDescErrors').value = '';
    document.getElementById('editDescScreenshot').value = '';
    document.getElementById('currentScreenshot').innerHTML = '';
    
    const pasteInfo = document.querySelector('#editDescModal .paste-info');
    if (pasteInfo) pasteInfo.remove();
    clipboardImage = null;
    
    editingDescriptionId = null;
    editingDescriptionDayId = null;
}

function hideEditDayModal() {
    document.getElementById('editDayModal').style.display = 'none';
    document.getElementById('editDayDate').value = '';
    document.getElementById('editDayAmount').value = '';
    document.getElementById('editCalendarCheck').checked = false;
    
    // Reset box analysis
    document.getElementById('editGrayBounce').value = 0;
    document.getElementById('editGrayBreak').value = 0;
    document.getElementById('editGreenBounce').value = 0;
    document.getElementById('editGreenBreak').value = 0;
    document.getElementById('editRedBounce').value = 0;
    document.getElementById('editRedBreak').value = 0;
    
    // Reset setups
    document.getElementById('editSetup1').checked = false;
    document.getElementById('editSetup2').checked = false;
    document.getElementById('editSetup3').checked = false;
    document.getElementById('editSetup4').checked = false;
    document.getElementById('editSetup5').checked = false;
    document.getElementById('editSetup6').checked = false;
    
    editingDayId = null;
}

// Helper functions
function calculateWeeklyAmount() {
    const dateFrom = document.getElementById('weeklyDateFrom').value;
    const dateTo = document.getElementById('weeklyDateTo').value;
    
    if (!dateFrom || !dateTo) {
        // Usuń informację jeśli nie ma obu dat
        const calculationInfo = document.getElementById('weeklyCalculationInfo');
        if (calculationInfo) {
            calculationInfo.remove();
        }
        return;
    }
    
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (toDate < fromDate) {
        alert('Data końcowa nie może być wcześniejsza niż data początkowa');
        return;
    }
    
    // Znajdź wszystkie wpisy dzienne w wybranym okresie
    const dayEntriesInPeriod = entries.filter(entry => {
        if (entry.type !== 'day' || !entry.date) return false;
        
        const entryDate = new Date(entry.date);
        return entryDate >= fromDate && entryDate <= toDate;
    });
    
    // Oblicz całkowity zysk/stratę
    const totalAmount = dayEntriesInPeriod.reduce((sum, entry) => sum + entry.amount, 0);
    
    // Ustaw obliczoną wartość w polu
    document.getElementById('weeklyAmount').value = totalAmount;
    
    // Dodaj informację o obliczeniu
    let calculationInfo = document.getElementById('weeklyCalculationInfo');
    if (!calculationInfo) {
        calculationInfo = document.createElement('div');
        calculationInfo.id = 'weeklyCalculationInfo';
        calculationInfo.style.cssText = 'margin-top: 5px; font-size: 10px; color: #4CAF50; font-weight: bold;';
        document.getElementById('weeklyAmount').parentNode.appendChild(calculationInfo);
    }
    
    const daysCount = dayEntriesInPeriod.length;
    const profitClass = totalAmount >= 0 ? '#4CAF50' : '#f44336';
    const profitSign = totalAmount >= 0 ? '+' : '';
    
    calculationInfo.innerHTML = `
        <span style="color: ${profitClass};">
            ✓ Automatycznie obliczono z ${daysCount} dni: ${profitSign}${totalAmount.toFixed(2)}
        </span>
    `;
    
    if (daysCount === 0) {
        calculationInfo.innerHTML = '<span style="color: #888;">⚠️ Brak wpisów w wybranym okresie</span>';
        document.getElementById('weeklyAmount').value = 0;
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = [
        'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
        'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
    ];
    const weekdays = [
        'niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'
    ];
    
    return {
        formatted: `${date.getDate()} ${months[date.getMonth()]}`,
        weekday: weekdays[date.getDay()]
    };
}

function calculatePercent(amount) {
    return ((amount / initialCapitalAmount) * 100).toFixed(2);
}

function updateInitialCapital() {
    const newInitialCapital = parseInt(document.getElementById('initialCapital').value) || 300;
    
    if (newInitialCapital <= 0) {
        alert('Kapitał początkowy musi być większy od 0');
        document.getElementById('initialCapital').value = initialCapitalAmount;
        return;
    }
    
    // Oblicz różnicę i zaktualizuj obecny kapitał
    const difference = newInitialCapital - initialCapitalAmount;
    currentCapital += difference;
    initialCapitalAmount = newInitialCapital;
    
    // Przelicz procenty dla wszystkich wpisów
    entries.forEach(entry => {
        if (entry.amount !== undefined) {
            entry.percent = calculatePercent(entry.amount);
        }
    });
    
    saveToLocalStorage();
    renderEntries();
}

function formatMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function showScreenshot(src) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:pointer';
    
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain';
    
    modal.appendChild(img);
    modal.onclick = () => document.body.removeChild(modal);
    document.body.appendChild(modal);
}

function renderBoxAnalysis(boxData) {
    if (!boxData) return '';
    
    const parts = [];
    if (boxData.grayBounce || boxData.grayBreak) {
        parts.push(`<span style="color: #888;">S: ${boxData.grayBounce}/${boxData.grayBreak}</span>`);
    }
    if (boxData.greenBounce || boxData.greenBreak) {
        parts.push(`<span style="color: #4CAF50;">Z: ${boxData.greenBounce}/${boxData.greenBreak}</span>`);
    }
    if (boxData.redBounce || boxData.redBreak) {
        parts.push(`<span style="color: #f44336;">C: ${boxData.redBounce}/${boxData.redBreak}</span>`);
    }
    
    return parts.length > 0 ? `<div class="box-analysis">${parts.join('')}</div>` : '';
}

function renderSetupAnalysis(setupData) {
    if (!setupData) return '';
    
    const activeSetups = [];
    for (let i = 1; i <= 6; i++) {
        if (setupData[`setup${i}`]) {
            activeSetups.push(`<span>S${i}</span>`);
        }
    }
    
    return activeSetups.length > 0 ? `<div class="setup-analysis">${activeSetups.join('')}</div>` : '';
}

// CRUD operations
function addDay() {
    const dateInput = document.getElementById('dayDate').value;
    const amountInput = parseFloat(document.getElementById('dayAmount').value);
    const calendarChecked = document.getElementById('calendarCheck').checked;
    
    const boxAnalysis = {
        grayBounce: parseInt(document.getElementById('grayBounce').value) || 0,
        grayBreak: parseInt(document.getElementById('grayBreak').value) || 0,
        greenBounce: parseInt(document.getElementById('greenBounce').value) || 0,
        greenBreak: parseInt(document.getElementById('greenBreak').value) || 0,
        redBounce: parseInt(document.getElementById('redBounce').value) || 0,
        redBreak: parseInt(document.getElementById('redBreak').value) || 0
    };
    
    const setupAnalysis = {
        setup1: document.getElementById('setup1').checked,
        setup2: document.getElementById('setup2').checked,
        setup3: document.getElementById('setup3').checked,
        setup4: document.getElementById('setup4').checked,
        setup5: document.getElementById('setup5').checked,
        setup6: document.getElementById('setup6').checked
    };
    
    if (!dateInput || isNaN(amountInput)) {
        alert('Proszę wypełnić wszystkie pola');
        return;
    }
    
    const dateInfo = formatDate(dateInput);
    const percent = calculatePercent(amountInput);
    
    const dayData = {
        id: Date.now(),
        type: 'day',
        date: dateInput,
        dateFormatted: dateInfo.formatted,
        weekday: dateInfo.weekday,
        amount: amountInput,
        percent: percent,
        calendarChecked: calendarChecked,
        boxAnalysis: boxAnalysis,
        setupAnalysis: setupAnalysis,
        descriptions: [],
        timestamp: Date.now()
    };
    
    entries.unshift(dayData);
    currentCapital += amountInput;
    
    // Resetuj na pierwszą stronę po dodaniu nowego wpisu
    currentPage = 1;
    
    saveToLocalStorage();
    renderEntries();
    hideAddDayModal();
}

function addWeeklySummary() {
    const dateFrom = document.getElementById('weeklyDateFrom').value;
    const dateTo = document.getElementById('weeklyDateTo').value;
    const amountInput = parseFloat(document.getElementById('weeklyAmount').value);
    const improveText = document.getElementById('weeklyImprove').value;
    const goodText = document.getElementById('weeklyGood').value;
    
    if (!dateFrom || !dateTo || isNaN(amountInput) || !improveText || !goodText) {
        alert('Proszę wypełnić wszystkie pola');
        return;
    }
    
    const percent = calculatePercent(amountInput);
    const dateFromFormatted = formatDate(dateFrom);
    const dateToFormatted = formatDate(dateTo);
    
    const weeklyData = {
        id: Date.now(),
        type: 'weekly',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dateFromFormatted: dateFromFormatted.formatted,
        dateToFormatted: dateToFormatted.formatted,
        amount: amountInput,
        percent: percent,
        improve: improveText,
        good: goodText,
        timestamp: Date.now()
    };
    
    entries.unshift(weeklyData);
    currentCapital += amountInput;
    
    // Resetuj na pierwszą stronę po dodaniu nowego wpisu
    currentPage = 1;
    
    saveToLocalStorage();
    renderEntries();
    hideAddWeeklyModal();
}

function addDescription() {
    const hour = document.getElementById('descHour').value;
    const text = document.getElementById('descText').value;
    const errors = document.getElementById('descErrors').value;
    const screenshotFile = document.getElementById('descScreenshot').files[0] || clipboardImage;
    
    if (!hour || !text) {
        alert('Proszę wypełnić godzinę i opis');
        return;
    }
    
    const entry = entries.find(e => e.id === currentDayId && e.type === 'day');
    if (entry) {
        const description = {
            id: Date.now(),
            hour: hour,
            text: text,
            errors: errors,
            screenshot: null
        };
        
        if (screenshotFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                description.screenshot = e.target.result;
                entry.descriptions.push(description);
                saveToLocalStorage();
                renderEntries();
            };
            reader.readAsDataURL(screenshotFile);
        } else {
            entry.descriptions.push(description);
            saveToLocalStorage();
            renderEntries();
        }
    }
    
    clipboardImage = null;
    hideAddDescModal();
}

function toggleEntry(entryId) {
    const entryContent = document.getElementById(`entry-content-${entryId}`);
    entryContent.classList.toggle('expanded');
    saveToLocalStorage();
}

function editEntry(entryId) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    if (entry.type === 'day') {
        editingDayId = entryId;
        document.getElementById('editDayDate').value = entry.date;
        document.getElementById('editDayAmount').value = entry.amount;
        document.getElementById('editCalendarCheck').checked = entry.calendarChecked || false;
        
        if (entry.boxAnalysis) {
            document.getElementById('editGrayBounce').value = entry.boxAnalysis.grayBounce || 0;
            document.getElementById('editGrayBreak').value = entry.boxAnalysis.grayBreak || 0;
            document.getElementById('editGreenBounce').value = entry.boxAnalysis.greenBounce || 0;
            document.getElementById('editGreenBreak').value = entry.boxAnalysis.greenBreak || 0;
            document.getElementById('editRedBounce').value = entry.boxAnalysis.redBounce || 0;
            document.getElementById('editRedBreak').value = entry.boxAnalysis.redBreak || 0;
        }
        
        if (entry.setupAnalysis) {
            document.getElementById('editSetup1').checked = entry.setupAnalysis.setup1 || false;
            document.getElementById('editSetup2').checked = entry.setupAnalysis.setup2 || false;
            document.getElementById('editSetup3').checked = entry.setupAnalysis.setup3 || false;
            document.getElementById('editSetup4').checked = entry.setupAnalysis.setup4 || false;
            document.getElementById('editSetup5').checked = entry.setupAnalysis.setup5 || false;
            document.getElementById('editSetup6').checked = entry.setupAnalysis.setup6 || false;
        }
        
        document.getElementById('editDayModal').style.display = 'block';
    }
}

function saveEditDay() {
    const dateInput = document.getElementById('editDayDate').value;
    const amountInput = parseFloat(document.getElementById('editDayAmount').value);
    const calendarChecked = document.getElementById('editCalendarCheck').checked;
    
    const boxAnalysis = {
        grayBounce: parseInt(document.getElementById('editGrayBounce').value) || 0,
        grayBreak: parseInt(document.getElementById('editGrayBreak').value) || 0,
        greenBounce: parseInt(document.getElementById('editGreenBounce').value) || 0,
        greenBreak: parseInt(document.getElementById('editGreenBreak').value) || 0,
        redBounce: parseInt(document.getElementById('editRedBounce').value) || 0,
        redBreak: parseInt(document.getElementById('editRedBreak').value) || 0
    };
    
    const setupAnalysis = {
        setup1: document.getElementById('editSetup1').checked,
        setup2: document.getElementById('editSetup2').checked,
        setup3: document.getElementById('editSetup3').checked,
        setup4: document.getElementById('editSetup4').checked,
        setup5: document.getElementById('editSetup5').checked,
        setup6: document.getElementById('editSetup6').checked
    };
    
    if (!dateInput || isNaN(amountInput)) {
        alert('Proszę wypełnić wszystkie pola');
        return;
    }
    
    const entryIndex = entries.findIndex(e => e.id === editingDayId);
    if (entryIndex === -1) return;
    
    const entry = entries[entryIndex];
    const oldAmount = entry.amount;
    
    currentCapital = currentCapital - oldAmount + amountInput;
    
    const dateInfo = formatDate(dateInput);
    const percent = calculatePercent(amountInput);
    
    entry.date = dateInput;
    entry.dateFormatted = dateInfo.formatted;
    entry.weekday = dateInfo.weekday;
    entry.amount = amountInput;
    entry.percent = percent;
    entry.calendarChecked = calendarChecked;
    entry.boxAnalysis = boxAnalysis;
    entry.setupAnalysis = setupAnalysis;
    
    saveToLocalStorage();
    renderEntries();
    hideEditDayModal();
}

function deleteEntry(entryId) {
    if (confirm('Czy na pewno chcesz usunąć ten wpis?')) {
        const entryIndex = entries.findIndex(e => e.id === entryId);
        if (entryIndex !== -1) {
            currentCapital -= entries[entryIndex].amount;
            entries.splice(entryIndex, 1);
            
            // Sprawdź czy obecna strona nie jest pusta po usunięciu
            const totalPages = Math.ceil(entries.length / entriesPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                currentPage = totalPages;
            } else if (entries.length === 0) {
                currentPage = 1;
            }
            
            saveToLocalStorage();
            renderEntries();
        }
    }
}

function editDescription(dayId, descId) {
    const day = entries.find(e => e.id === dayId && e.type === 'day');
    if (!day) return;
    
    const description = day.descriptions.find(d => d.id === descId);
    if (!description) return;
    
    editingDescriptionId = descId;
    editingDescriptionDayId = dayId;
    
    document.getElementById('editDescHour').value = description.hour;
    document.getElementById('editDescText').value = description.text;
    document.getElementById('editDescErrors').value = description.errors || '';
    
    if (description.screenshot) {
        document.getElementById('currentScreenshot').innerHTML = 'Aktualny screenshot: <span style="color: #4CAF50;">✓ załączony</span>';
    } else {
        document.getElementById('currentScreenshot').innerHTML = 'Brak screenshotu';
    }
    
    document.getElementById('editDescModal').style.display = 'block';
}

function saveEditDescription() {
    const hour = document.getElementById('editDescHour').value;
    const text = document.getElementById('editDescText').value;
    const errors = document.getElementById('editDescErrors').value;
    const screenshotFile = document.getElementById('editDescScreenshot').files[0] || clipboardImage;
    
    if (!hour || !text) {
        alert('Proszę wypełnić godzinę i opis');
        return;
    }
    
    const day = entries.find(e => e.id === editingDescriptionDayId && e.type === 'day');
    if (!day) return;
    
    const descIndex = day.descriptions.findIndex(d => d.id === editingDescriptionId);
    if (descIndex === -1) return;
    
    const description = day.descriptions[descIndex];
    
    description.hour = hour;
    description.text = text;
    description.errors = errors;
    
    if (screenshotFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            description.screenshot = e.target.result;
            saveToLocalStorage();
            renderEntries();
            hideEditDescModal();
        };
        reader.readAsDataURL(screenshotFile);
    } else {
        saveToLocalStorage();
        renderEntries();
        hideEditDescModal();
    }
    
    clipboardImage = null;
}

function deleteDescription(dayId, descId) {
    if (confirm('Czy na pewno chcesz usunąć ten opis?')) {
        const day = entries.find(e => e.id === dayId && e.type === 'day');
        if (!day) return;
        
        const descIndex = day.descriptions.findIndex(d => d.id === descId);
        if (descIndex !== -1) {
            day.descriptions.splice(descIndex, 1);
            saveToLocalStorage();
            renderEntries();
        }
    }
}

// Rendering functions
function renderEntries() {
    renderFilteredEntries(entries);
}

function renderFilteredEntries(entriesToRender) {
    const entriesList = document.getElementById('entriesList');
    
    const filterStatus = document.getElementById('filterStatus');
    entriesList.innerHTML = '';
    if (filterStatus) {
        entriesList.appendChild(filterStatus);
    }
    
    if (entriesToRender.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'text-align: center; color: #888; padding: 40px;';
        emptyDiv.textContent = 'Brak wpisów w wybranym okresie';
        entriesList.appendChild(emptyDiv);
        renderPagination(0, 0);
        return;
    }
    
    const sortedEntries = [...entriesToRender].sort((a, b) => b.timestamp - a.timestamp);
    
    // Paginacja
    const totalEntries = sortedEntries.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const currentEntries = sortedEntries.slice(startIndex, endIndex);
    
    currentEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        
        if (entry.type === 'day') {
            entryElement.className = 'day-entry';
            
            const profitClass = entry.amount >= 0 ? 'positive' : 'negative';
            const profitSign = entry.amount >= 0 ? '+' : '';
            const hasErrors = entry.descriptions.some(desc => desc.errors && desc.errors.trim() !== '');
            const statusLightClass = hasErrors ? 'has-errors' : 'no-errors';
            
            entryElement.innerHTML = `
                <div class="day-header" onclick="toggleEntry(${entry.id})">
                    <div class="entry-info">
                        <div class="date-section">
                            <div class="day-date">${entry.dateFormatted}</div>
                            <div class="day-weekday">
                                ${entry.weekday}
                                ${entry.calendarChecked ? '<span class="calendar-check">✓ Kalendarz</span>' : ''}
                            </div>
                        </div>
                        ${renderBoxAnalysis(entry.boxAnalysis)}
                        ${renderSetupAnalysis(entry.setupAnalysis)}
                    </div>
                    <div class="entry-buttons">
                        <button class="icon-btn" onclick="event.stopPropagation(); showAddDescModal(${entry.id})" title="Dodaj opis">📝</button>
                        <button class="icon-btn" onclick="event.stopPropagation(); editEntry(${entry.id})" title="Edytuj">✏️</button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteEntry(${entry.id})" title="Usuń">🗑️</button>
                    </div>
                    <div class="entry-profit">
                        <div class="profit-amount ${profitClass}">${profitSign}${Math.abs(entry.amount).toFixed(2)}</div>
                        <div class="profit-percent">${profitSign}${entry.percent}%</div>
                    </div>
                    <div class="status-light ${statusLightClass}"></div>
                </div>
                <div id="entry-content-${entry.id}" class="entry-content">
                    <div>
                        ${entry.descriptions.map(desc => `
                            <div class="description-entry">
                                <div class="description-header">
                                    <div class="description-time">${desc.hour}:00</div>
                                    <div class="description-text">
                                        ${desc.text && desc.text.trim() !== '' ? 
                                            formatMarkdown(desc.text) : 
                                            (desc.errors && desc.errors.trim() !== '' ? 
                                                `<span style="color: #ff4444;">${formatMarkdown(desc.errors)}</span>` : 
                                                ''
                                            )
                                        }
                                    </div>
                                    <div class="description-buttons">
                                        <button class="icon-btn" onclick="event.stopPropagation(); editDescription(${entry.id}, ${desc.id})" title="Edytuj opis">✏️</button>
                                        <button class="icon-btn" onclick="event.stopPropagation(); deleteDescription(${entry.id}, ${desc.id})" title="Usuń opis">🗑️</button>
                                    </div>
                                    ${desc.screenshot ? 
                                        `<img src="${desc.screenshot}" alt="Screenshot" style="width: 60px; height: 30px; object-fit: cover; border: 1px solid #333; border-radius: 2px; margin-left: 10px; cursor: pointer;" onclick="showScreenshot(this.src)">` : 
                                        '<div class="description-chart">📊</div>'
                                    }
                                </div>
                                ${desc.text && desc.text.trim() !== '' && desc.errors && desc.errors.trim() !== '' ? `
                                    <div class="errors-section">
                                        <div class="errors-text">${formatMarkdown(desc.errors)}</div>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (entry.type === 'weekly') {
            const profitClass = entry.amount >= 0 ? 'positive' : 'negative';
            const profitSign = entry.amount >= 0 ? '+' : '';
            const weeklyClass = entry.amount >= 0 ? 'profit' : 'loss';
            
            entryElement.className = `weekly-entry ${weeklyClass}`;
            
            entryElement.innerHTML = `
                <div class="weekly-header" onclick="toggleEntry(${entry.id})">
                    <div class="entry-info">
                        <div class="date-section">
                            <div class="weekly-title">Podsumowanie tygodnia</div>
                            <div class="weekly-subtitle">${entry.dateFromFormatted} - ${entry.dateToFormatted}</div>
                        </div>
                    </div>
                    <div class="entry-buttons">
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteEntry(${entry.id})" title="Usuń">🗑️</button>
                    </div>
                    <div class="entry-profit">
                        <div class="profit-amount ${profitClass}">${profitSign}${Math.abs(entry.amount).toFixed(2)}</div>
                        <div class="profit-percent">${profitSign}${entry.percent}%</div>
                    </div>
                    <div class="status-light no-errors"></div>
                </div>
                <div id="entry-content-${entry.id}" class="entry-content">
                    <div class="weekly-content">
                        <div class="weekly-questions-grid">
                            <div class="weekly-question">
                                <div class="question-label">Co mogłem zrobić lepiej?</div>
                                <div class="question-text">${formatMarkdown(entry.improve)}</div>
                            </div>
                            <div class="weekly-question">
                                <div class="question-label">Co zrobiłem dobrze?</div>
                                <div class="question-text">${formatMarkdown(entry.good)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        entriesList.appendChild(entryElement);
    });
    
    // Renderuj paginację
    renderPagination(totalEntries, totalPages);
}

function renderPagination(totalEntries, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        return; // Nie pokazuj paginacji jeśli jest tylko jedna strona
    }
    
    // Informacja o wpisach
    const startEntry = (currentPage - 1) * entriesPerPage + 1;
    const endEntry = Math.min(currentPage * entriesPerPage, totalEntries);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'pagination-info';
    infoDiv.textContent = `Wpisy ${startEntry}-${endEntry} z ${totalEntries}`;
    paginationContainer.appendChild(infoDiv);
    
    // Przycisk Poprzednia
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '← Poprzednia';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    paginationContainer.appendChild(prevBtn);
    
    // Numery stron
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Pierwsza strona jeśli nie jest widoczna
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'pagination-btn';
        firstBtn.textContent = '1';
        firstBtn.onclick = () => goToPage(1);
        paginationContainer.appendChild(firstBtn);
        
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.className = 'pagination-info';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }
    
    // Widoczne strony
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        paginationContainer.appendChild(pageBtn);
    }
    
    // Ostatnia strona jeśli nie jest widoczna
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'pagination-info';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => goToPage(totalPages);
        paginationContainer.appendChild(lastBtn);
    }
    
    // Przycisk Następna
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Następna →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
}

function goToPage(page) {
    currentPage = page;
    saveToLocalStorage();
    renderEntries();
    
    // Przewiń do góry listy wpisów
    document.getElementById('entriesList').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// Close modals on outside click
window.onclick = function(event) {
    const modals = ['addDayModal', 'addDescModal', 'addWeeklyModal', 'editDayModal', 'editDescModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    const dayDateInput = document.getElementById('dayDate');
    if (dayDateInput) {
        dayDateInput.valueAsDate = new Date();
    }
    addPasteListeners();
    renderEntries();
});