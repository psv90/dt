// Supabase Integration for Trader Diary
// Dodaj ten skrypt do trader_diary_main.html przed zamknięciem </body>

class SupabaseSync {
    constructor() {
        this.supabaseUrl = 'https://iidkshppzbwujinxumtl.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZGtzaHBwemJ3dWppbnh1bXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODk1NjgsImV4cCI6MjA2NDI2NTU2OH0.pjPMuqk7SmBvixsolzCU3MDajL9QvawVEpOsxtQEQYg';
        this.isOnline = navigator.onLine;
        this.userId = this.getUserId();
        
        // Event listenery dla statusu połączenia
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncToCloud();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Pobierz lub wygeneruj unikalne ID użytkownika
    getUserId() {
        // Sprawdź czy jest zalogowany użytkownik
        if (window.userManager && window.userManager.getCurrentUser()) {
            return window.userManager.getCurrentUser().userId;
        }
        
        // Fallback - stary system
        let userId = localStorage.getItem('tradingUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('tradingUserId', userId);
        }
        return userId;
    }

    // Wykonaj zapytanie do Supabase
    async executeQuery(sql, params = []) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/execute_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    sql: sql,
                    params: params
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Database query error:', error);
            
            // Fallback do bezpośrednich zapytań REST API
            return await this.executeRestQuery(sql, params);
        }
    }

    // Alternatywna metoda używająca REST API Supabase
    async executeRestQuery(operation, tableName, data = null, conditions = null) {
        try {
            let url = `${this.supabaseUrl}/rest/v1/${tableName}`;
            let method = 'GET';
            let body = null;

            // Konfiguracja dla różnych operacji
            switch (operation) {
                case 'SELECT':
                    if (conditions) {
                        const queryParams = new URLSearchParams(conditions);
                        url += `?${queryParams.toString()}`;
                    }
                    break;
                case 'INSERT':
                    method = 'POST';
                    body = JSON.stringify(data);
                    break;
                case 'UPDATE':
                    method = 'PATCH';
                    body = JSON.stringify(data);
                    if (conditions) {
                        const queryParams = new URLSearchParams(conditions);
                        url += `?${queryParams.toString()}`;
                    }
                    break;
                case 'DELETE':
                    method = 'DELETE';
                    if (conditions) {
                        const queryParams = new URLSearchParams(conditions);
                        url += `?${queryParams.toString()}`;
                    }
                    break;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Prefer': 'return=representation'
                },
                body: body
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('REST API error:', error);
            throw error;
        }
    }

    // Utwórz tabele w bazie danych (używając Supabase Dashboard)
    async createTables() {
        try {
            console.log(`
                🚀 INSTRUKCJA KONFIGURACJI SUPABASE:

                1. Idź do Supabase Dashboard → SQL Editor
                2. Wykonaj następujące zapytania:

                -- Usuń wszystkie tabele jeśli istnieją
                DROP TABLE IF EXISTS dt_descriptions CASCADE;
                DROP TABLE IF EXISTS dt_entries CASCADE;
                DROP TABLE IF EXISTS dt_rules CASCADE;
                DROP TABLE IF EXISTS dt_setups CASCADE;
                DROP TABLE IF EXISTS dt_settings CASCADE;
                DROP TABLE IF EXISTS dt_users CASCADE;

                -- Utwórz tabele
                CREATE TABLE dt_users (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE dt_entries (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    entry_id BIGINT NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    entry_date DATE,
                    date_from DATE,
                    date_to DATE,
                    amount DECIMAL(10,2) NOT NULL,
                    percent DECIMAL(10,4),
                    calendar_checked BOOLEAN DEFAULT FALSE,
                    improve_text TEXT,
                    good_text TEXT,
                    box_analysis TEXT,
                    setup_analysis TEXT,
                    timestamp_created BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, entry_id)
                );

                CREATE TABLE dt_descriptions (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    entry_id BIGINT NOT NULL,
                    description_id BIGINT NOT NULL,
                    hour INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    errors TEXT,
                    screenshot TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE dt_rules (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    rule_id BIGINT NOT NULL,
                    text TEXT NOT NULL,
                    timestamp_created BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, rule_id)
                );

                CREATE TABLE dt_setups (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    setup_id BIGINT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    screenshots TEXT,
                    timestamp_created BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, setup_id)
                );

                CREATE TABLE dt_settings (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) UNIQUE NOT NULL,
                    current_capital DECIMAL(10,2) DEFAULT 300,
                    initial_capital DECIMAL(10,2) DEFAULT 300,
                    settings TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- WYŁĄCZ RLS dla wszystkich tabel (tymczasowo)
                ALTER TABLE dt_users DISABLE ROW LEVEL SECURITY;
                ALTER TABLE dt_entries DISABLE ROW LEVEL SECURITY;
                ALTER TABLE dt_descriptions DISABLE ROW LEVEL SECURITY;
                ALTER TABLE dt_rules DISABLE ROW LEVEL SECURITY;
                ALTER TABLE dt_setups DISABLE ROW LEVEL SECURITY;
                ALTER TABLE dt_settings DISABLE ROW LEVEL SECURITY;

                -- Dodaj indeksy
                CREATE INDEX idx_dt_entries_user_id ON dt_entries(user_id);
                CREATE INDEX idx_dt_entries_date ON dt_entries(entry_date);

                3. Znajdź właściwy ANON KEY:
                   → Settings → API → anon/public key
                   → Zastąp w supabase_integration.js

                4. Sprawdź czy tabele zostały utworzone w Table Editor
            `);
            return true;
        } catch (error) {
            console.error('Error creating tables:', error);
            return false;
        }
    }

    // Dodaj użytkownika do bazy
    async ensureUser() {
        try {
            const userData = { user_id: this.userId };
            await this.executeRestQuery('INSERT', 'dt_users', userData);
        } catch (error) {
            // Użytkownik prawdopodobnie już istnieje - to OK
            console.log('User already exists or created successfully');
        }
    }

    // Synchronizuj dane z chmury
    async syncFromCloud() {
        if (!this.isOnline) return;

        try {
            await this.ensureUser();
            
            // Pobierz wszystkie dane użytkownika
            const [entries, descriptions, rules, setups, settings] = await Promise.all([
                this.getEntriesFromCloud(),
                this.getDescriptionsFromCloud(),
                this.getRulesFromCloud(),
                this.getSetupsFromCloud(),
                this.getSettingsFromCloud()
            ]);

            // Połącz wpisy z opisami
            const entriesWithDescriptions = entries.map(entry => {
                entry.descriptions = descriptions.filter(desc => desc.entry_id === entry.entry_id);
                return entry;
            });

            // Zapisz do localStorage
            const data = {
                currentCapital: settings?.current_capital || 300,
                initialCapital: settings?.initial_capital || 300,
                entries: entriesWithDescriptions,
                rules: rules,
                setups: setups,
                filterSettings: settings?.settings || {}
            };

            localStorage.setItem('traderDiary', JSON.stringify(data));
            localStorage.setItem('traderRulesSetups', JSON.stringify({
                rules: rules,
                setups: setups,
                timestamp: Date.now()
            }));

            console.log('Data synced from cloud successfully');
            return true;
        } catch (error) {
            console.error('Error syncing from cloud:', error);
            return false;
        }
    }

    // Synchronizuj dane do chmury
    async syncToCloud() {
        if (!this.isOnline) return;

        try {
            await this.ensureUser();

            // Pobierz dane z localStorage
            const diaryData = JSON.parse(localStorage.getItem('traderDiary') || '{}');
            const rulesData = JSON.parse(localStorage.getItem('traderRulesSetups') || '{}');

            // Synchronizuj każdy typ danych
            await Promise.all([
                this.syncEntriesToCloud(diaryData.entries || []),
                this.syncRulesToCloud(rulesData.rules || []),
                this.syncSetupsToCloud(rulesData.setups || []),
                this.syncSettingsToCloud({
                    current_capital: diaryData.currentCapital || 300,
                    initial_capital: diaryData.initialCapital || 300,
                    settings: diaryData.filterSettings || {}
                })
            ]);

            console.log('Data synced to cloud successfully');
            return true;
        } catch (error) {
            console.error('Error syncing to cloud:', error);
            return false;
        }
    }

    // Pobierz wpisy z chmury
    async getEntriesFromCloud() {
        try {
            const conditions = { user_id: `eq.${this.userId}`, order: 'timestamp_created.desc' };
            const result = await this.executeRestQuery('SELECT', 'dt_entries', null, conditions);
            return result || [];
        } catch (error) {
            console.error('Error getting entries:', error);
            return [];
        }
    }

    // Pobierz opisy z chmury
    async getDescriptionsFromCloud() {
        try {
            const conditions = { user_id: `eq.${this.userId}` };
            const result = await this.executeRestQuery('SELECT', 'dt_descriptions', null, conditions);
            return result || [];
        } catch (error) {
            console.error('Error getting descriptions:', error);
            return [];
        }
    }

    // Pobierz zasady z chmury
    async getRulesFromCloud() {
        try {
            const conditions = { user_id: `eq.${this.userId}`, order: 'timestamp_created.asc' };
            const result = await this.executeRestQuery('SELECT', 'dt_rules', null, conditions);
            return (result || []).map(rule => ({
                id: rule.rule_id,
                text: rule.text,
                timestamp: rule.timestamp_created
            }));
        } catch (error) {
            console.error('Error getting rules:', error);
            return [];
        }
    }

    // Pobierz setupy z chmury
    async getSetupsFromCloud() {
        try {
            const conditions = { user_id: `eq.${this.userId}`, order: 'timestamp_created.asc' };
            const result = await this.executeRestQuery('SELECT', 'dt_setups', null, conditions);
            return (result || []).map(setup => ({
                id: setup.setup_id,
                name: setup.name,
                description: setup.description,
                screenshots: setup.screenshots || [],
                timestamp: setup.timestamp_created
            }));
        } catch (error) {
            console.error('Error getting setups:', error);
            return [];
        }
    }

    // Pobierz ustawienia z chmury
    async getSettingsFromCloud() {
        try {
            const conditions = { user_id: `eq.${this.userId}` };
            const result = await this.executeRestQuery('SELECT', 'dt_settings', null, conditions);
            return result?.[0] || null;
        } catch (error) {
            console.error('Error getting settings:', error);
            return null;
        }
    }

    // Synchronizuj wpisy do chmury
    async syncEntriesToCloud(entries) {
        for (const entry of entries) {
            try {
                // Przygotuj dane wpisu
                const entryData = {
                    user_id: this.userId,
                    entry_id: entry.id,
                    type: entry.type,
                    entry_date: entry.date || null,
                    date_from: entry.dateFrom || null,
                    date_to: entry.dateTo || null,
                    amount: entry.amount,
                    percent: entry.percent || 0,
                    calendar_checked: entry.calendarChecked || false,
                    improve_text: entry.improve || null,
                    good_text: entry.good || null,
                    box_analysis: entry.boxAnalysis ? JSON.stringify(entry.boxAnalysis) : null,
                    setup_analysis: entry.setupAnalysis ? JSON.stringify(entry.setupAnalysis) : null,
                    timestamp_created: entry.timestamp
                };

                // Sprawdź czy wpis już istnieje
                const existingEntry = await this.executeRestQuery(
                    'SELECT', 
                    'dt_entries', 
                    null, 
                    { 
                        user_id: `eq.${this.userId}`, 
                        entry_id: `eq.${entry.id}`,
                        select: 'id'
                    }
                );

                if (existingEntry && existingEntry.length > 0) {
                    // Aktualizuj istniejący wpis
                    await this.executeRestQuery(
                        'UPDATE',
                        'dt_entries',
                        entryData,
                        { 
                            user_id: `eq.${this.userId}`, 
                            entry_id: `eq.${entry.id}` 
                        }
                    );
                    console.log(`Updated entry ${entry.id}`);
                } else {
                    // Dodaj nowy wpis
                    await this.executeRestQuery('INSERT', 'dt_entries', entryData);
                    console.log(`Inserted entry ${entry.id}`);
                }

                // Synchronizuj opisy dla tego wpisu
                if (entry.descriptions && entry.descriptions.length > 0) {
                    await this.syncDescriptionsToCloud(entry.id, entry.descriptions);
                }

            } catch (error) {
                console.error(`Error syncing entry ${entry.id}:`, error);
            }
        }
    }

    // Synchronizuj opisy do chmury
    async syncDescriptionsToCloud(entryId, descriptions) {
        try {
            // Usuń stare opisy dla tego wpisu
            await this.executeRestQuery(
                'DELETE',
                'dt_descriptions',
                null,
                { 
                    user_id: `eq.${this.userId}`, 
                    entry_id: `eq.${entryId}` 
                }
            );

            // Dodaj nowe opisy
            for (const desc of descriptions) {
                const descData = {
                    user_id: this.userId,
                    entry_id: entryId,
                    description_id: desc.id,
                    hour: desc.hour,
                    text: desc.text,
                    errors: desc.errors || null,
                    screenshot: desc.screenshot || null
                };

                await this.executeRestQuery('INSERT', 'dt_descriptions', descData);
                console.log(`Inserted description ${desc.id} for entry ${entryId}`);
            }
        } catch (error) {
            console.error(`Error syncing descriptions for entry ${entryId}:`, error);
        }
    }

    // Synchronizuj zasady do chmury
    async syncRulesToCloud(rules) {
        try {
            console.log(`Syncing ${rules.length} rules to cloud for user ${this.userId}`);
            
            // Usuń stare zasady użytkownika
            await this.executeRestQuery(
                'DELETE',
                'dt_rules',
                null,
                { user_id: `eq.${this.userId}` }
            );
            console.log('Deleted old rules');

            // Dodaj nowe zasady
            for (const rule of rules) {
                const ruleData = {
                    user_id: this.userId,
                    rule_id: rule.id,
                    text: rule.text,
                    timestamp_created: rule.timestamp
                };

                await this.executeRestQuery('INSERT', 'dt_rules', ruleData);
                console.log(`Inserted rule ${rule.id}: "${rule.text.substring(0, 30)}..."`);
            }
            
            console.log(`Successfully synced ${rules.length} rules`);
        } catch (error) {
            console.error('Error syncing rules:', error);
            throw error;
        }
    }

    // Synchronizuj setupy do chmury
    async syncSetupsToCloud(setups) {
        try {
            console.log(`Syncing ${setups.length} setups to cloud for user ${this.userId}`);
            
            // Usuń stare setupy użytkownika
            await this.executeRestQuery(
                'DELETE',
                'dt_setups',
                null,
                { user_id: `eq.${this.userId}` }
            );
            console.log('Deleted old setups');

            // Dodaj nowe setupy
            for (const setup of setups) {
                const setupData = {
                    user_id: this.userId,
                    setup_id: setup.id,
                    name: setup.name,
                    description: setup.description || null,
                    screenshots: setup.screenshots ? JSON.stringify(setup.screenshots) : null,
                    timestamp_created: setup.timestamp
                };

                await this.executeRestQuery('INSERT', 'dt_setups', setupData);
                console.log(`Inserted setup ${setup.id}: "${setup.name}"`);
            }
            
            console.log(`Successfully synced ${setups.length} setups`);
        } catch (error) {
            console.error('Error syncing setups:', error);
            throw error;
        }
    }

    // Synchronizuj ustawienia do chmury
    async syncSettingsToCloud(settings) {
        try {
            const settingsData = {
                user_id: this.userId,
                current_capital: settings.current_capital,
                initial_capital: settings.initial_capital,
                settings: settings.settings ? JSON.stringify(settings.settings) : null
            };

            // Sprawdź czy ustawienia już istnieją
            const existingSettings = await this.executeRestQuery(
                'SELECT',
                'dt_settings',
                null,
                { 
                    user_id: `eq.${this.userId}`,
                    select: 'id'
                }
            );

            if (existingSettings && existingSettings.length > 0) {
                // Aktualizuj istniejące ustawienia
                await this.executeRestQuery(
                    'UPDATE',
                    'dt_settings',
                    settingsData,
                    { user_id: `eq.${this.userId}` }
                );
                console.log('Updated settings');
            } else {
                // Dodaj nowe ustawienia
                await this.executeRestQuery('INSERT', 'dt_settings', settingsData);
                console.log('Inserted settings');
            }
        } catch (error) {
            console.error('Error syncing settings:', error);
        }
    }

    // Wymuś pełną synchronizację
    async forceSyncAll() {
        try {
            await this.createTables();
            await this.syncFromCloud();
            await this.syncToCloud();
            return true;
        } catch (error) {
            console.error('Force sync error:', error);
            return false;
        }
    }

    // Sprawdź status połączenia z bazą
    async checkConnection() {
        try {
            const result = await this.executeRestQuery('SELECT', 'dt_users', null, { 
                user_id: `eq.${this.userId}`,
                select: 'user_id',
                limit: '1'
            });
            console.log('Database connection OK');
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            return false;
        }
    }
}

// Globalna instancja Supabase
window.supabaseSync = new SupabaseSync();

// Funkcje pomocnicze do dodania do głównego skryptu
function addSupabaseIntegration() {
    // Dodaj przycisk synchronizacji do interface
    const filtersSection = document.querySelector('.filters-section .filters-row');
    if (filtersSection) {
        const syncGroup = document.createElement('div');
        syncGroup.className = 'filter-group';
        syncGroup.innerHTML = `
            <button class="filter-btn" onclick="manualSync()" title="Synchronizuj z chmurą" id="syncBtn">
                ☁️ Sync
            </button>
            <span id="syncStatus" class="filter-separator" style="color: #888;">Offline</span>
        `;
        filtersSection.appendChild(syncGroup);
    }

    // Automatyczna synchronizacja przy starcie
    setTimeout(async () => {
        const connected = await window.supabaseSync.checkConnection();
        updateSyncStatus(connected);
        
        if (connected) {
            await window.supabaseSync.syncFromCloud();
        }
    }, 1000);

    // Automatyczna synchronizacja co 5 minut
    setInterval(async () => {
        if (navigator.onLine) {
            await window.supabaseSync.syncToCloud();
        }
    }, 5 * 60 * 1000);
}

// Ręczna synchronizacja
async function manualSync() {
    const btn = document.getElementById('syncBtn');
    const status = document.getElementById('syncStatus');
    
    btn.disabled = true;
    btn.textContent = '⏳ Sync...';
    status.textContent = 'Synchronizacja...';
    
    try {
        const success = await window.supabaseSync.forceSyncAll();
        if (success) {
            status.textContent = 'Zsynchronizowano';
            status.style.color = '#4CAF50';
            
            // Odśwież interfejs
            loadFromLocalStorage();
            renderEntries();
            
            setTimeout(() => {
                updateSyncStatus(true);
            }, 2000);
        } else {
            throw new Error('Sync failed');
        }
    } catch (error) {
        status.textContent = 'Błąd sync';
        status.style.color = '#f44336';
        console.error('Manual sync error:', error);
        
        setTimeout(() => {
            updateSyncStatus(false);
        }, 2000);
    }
    
    btn.disabled = false;
    btn.textContent = '☁️ Sync';
}

// Aktualizuj status synchronizacji
function updateSyncStatus(connected) {
    const status = document.getElementById('syncStatus');
    if (status) {
        if (connected && navigator.onLine) {
            status.textContent = 'Online';
            status.style.color = '#4CAF50';
        } else {
            status.textContent = 'Offline';
            status.style.color = '#888';
        }
    }
}

// Zmodyfikuj istniejące funkcje zapisywania
const originalSaveToLocalStorage = window.saveToLocalStorage;
window.saveToLocalStorage = function() {
    if (originalSaveToLocalStorage) {
        originalSaveToLocalStorage();
    }
    
    // Automatyczna synchronizacja po zapisie (z debounce)
    if (window.supabaseSync && navigator.onLine) {
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(async () => {
            try {
                console.log('Auto-syncing to cloud...');
                await window.supabaseSync.syncToCloud();
                updateSyncStatus(true);
            } catch (error) {
                console.error('Auto-sync failed:', error);
                updateSyncStatus(false);
            }
        }, 2000);
    }
};

// Debug funkcja - sprawdź zasady w localStorage
function debugRulesLS() {
    const data = localStorage.getItem('traderRulesSetups');
    if (data) {
        const parsed = JSON.parse(data);
        console.log('LocalStorage rules/setups:', {
            rules: parsed.rules?.length || 0,
            setups: parsed.setups?.length || 0,
            lastRule: parsed.rules?.[0]?.text?.substring(0, 50),
            lastSetup: parsed.setups?.[0]?.name
        });
        return parsed;
    }
    console.log('No rules/setups data in localStorage');
    return null;
}

// Debug funkcja - sprawdź zasady w bazie danych
async function debugRulesDB() {
    try {
        const rules = await window.supabaseSync.getRulesFromCloud();
        const setups = await window.supabaseSync.getSetupsFromCloud();
        console.log('Database rules/setups:', {
            rules: rules.length,
            setups: setups.length,
            lastRule: rules[0]?.text?.substring(0, 50),
            lastSetup: setups[0]?.name
        });
        return { rules, setups };
    } catch (error) {
        console.error('Error checking rules database:', error);
        return { rules: [], setups: [] };
    }
}

// Dodaj funkcje debug do window
window.debugRulesLS = debugRulesLS;
window.debugRulesDB = debugRulesDB;

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addSupabaseIntegration, 500);
});