// Proste zarządzanie użytkownikami
class UserManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
    }

    // Załaduj użytkowników z localStorage
    loadUsers() {
        const users = localStorage.getItem('traderUsers');
        return users ? JSON.parse(users) : {};
    }

    // Zapisz użytkowników do localStorage
    saveUsers() {
        localStorage.setItem('traderUsers', JSON.stringify(this.users));
    }

    // Pobierz aktualnego użytkownika
    getCurrentUser() {
        const currentUserId = localStorage.getItem('currentUserId');
        if (currentUserId && this.users[currentUserId]) {
            this.currentUser = this.users[currentUserId];
            return this.currentUser;
        }
        return null;
    }

    // Utwórz nowego użytkownika
    createUser(username, displayName = '', password = '') {
        if (!username || username.trim() === '') {
            throw new Error('Nazwa użytkownika jest wymagana');
        }

        if (!password || password.trim() === '') {
            throw new Error('Hasło jest wymagane');
        }

        if (password.length < 4) {
            throw new Error('Hasło musi mieć minimum 4 znaki');
        }

        username = username.trim().toLowerCase();

        // Sprawdź czy użytkownik już istnieje
        if (this.users[username]) {
            throw new Error('Użytkownik o tej nazwie już istnieje');
        }

        // Prosty hash hasła (tylko dla demonstracji - w produkcji użyj bcrypt)
        const hashedPassword = this.simpleHash(password);

        // Utwórz nowego użytkownika
        const newUser = {
            username: username,
            displayName: displayName || username,
            passwordHash: hashedPassword,
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        this.users[username] = newUser;
        this.saveUsers();

        return newUser;
    }

    // Zaloguj użytkownika
    loginUser(username, password) {
        if (!username || username.trim() === '') {
            throw new Error('Nazwa użytkownika jest wymagana');
        }

        if (!password || password.trim() === '') {
            throw new Error('Hasło jest wymagane');
        }

        username = username.trim().toLowerCase();

        if (!this.users[username]) {
            throw new Error('Nieprawidłowa nazwa użytkownika lub hasło');
        }

        const user = this.users[username];
        
        // Sprawdź hasło
        if (!this.verifyPassword(password, user.passwordHash)) {
            throw new Error('Nieprawidłowa nazwa użytkownika lub hasło');
        }

        user.lastLogin = new Date().toISOString();
        this.users[username] = user;
        this.saveUsers();

        this.currentUser = user;
        localStorage.setItem('currentUserId', username);

        return user;
    }

    // Prosty hash hasła (tylko dla demonstracji)
    simpleHash(password) {
        let hash = 0;
        const salt = 'traderDiarySalt2024';
        const input = password + salt;
        
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString();
    }

    // Sprawdź hasło
    verifyPassword(password, hash) {
        return this.simpleHash(password) === hash;
    }

    // Zmień hasło użytkownika
    changePassword(username, oldPassword, newPassword) {
        if (!this.users[username]) {
            throw new Error('Użytkownik nie istnieje');
        }

        if (!this.verifyPassword(oldPassword, this.users[username].passwordHash)) {
            throw new Error('Nieprawidłowe stare hasło');
        }

        if (newPassword.length < 4) {
            throw new Error('Nowe hasło musi mieć minimum 4 znaki');
        }

        this.users[username].passwordHash = this.simpleHash(newPassword);
        this.saveUsers();

        return true;
    }

    // Wyloguj użytkownika
    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem('currentUserId');
    }

    // Sprawdź czy użytkownik jest zalogowany
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Pobierz listę wszystkich użytkowników
    getAllUsers() {
        return Object.values(this.users);
    }

    // Usuń użytkownika
    deleteUser(username) {
        if (this.users[username]) {
            delete this.users[username];
            this.saveUsers();
            
            // Jeśli usuwamy aktualnego użytkownika, wyloguj
            if (this.currentUser && this.currentUser.username === username) {
                this.logoutUser();
            }
            
            return true;
        }
        return false;
    }
}

// Globalna instancja
window.userManager = new UserManager();

// Funkcje interfejsu użytkownika
function showLoginModal() {
    if (document.getElementById('loginModal')) return;

    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3 class="modal-title">🔐 Trader Diary - Logowanie</h3>
            
            <div class="form-group">
                <label class="form-label">Nazwa użytkownika:</label>
                <input type="text" id="loginUsername" class="form-input" placeholder="Wpisz swoją nazwę użytkownika" autocomplete="username">
            </div>
            
            <div class="form-group">
                <label class="form-label">Hasło:</label>
                <input type="password" id="loginPassword" class="form-input" placeholder="Wpisz hasło" autocomplete="current-password">
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="showRegisterForm()">Nowy użytkownik</button>
                <button class="btn btn-primary" onclick="handleLogin()">Zaloguj się</button>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background-color: #0a0a0a; border-radius: 3px;">
                <div style="font-size: 11px; color: #888; margin-bottom: 8px;">Istniejący użytkownicy:</div>
                <div id="existingUsers" style="font-size: 10px; color: #666;"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Wypełnij listę istniejących użytkowników
    updateExistingUsersList();
    
    // Focus na input
    document.getElementById('loginUsername').focus();
    
    // Enter key listeners
    document.getElementById('loginUsername').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginPassword').focus();
        }
    });
    
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

function showRegisterForm() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3 class="modal-title">👤 Utwórz nowe konto</h3>
            
            <div class="form-group">
                <label class="form-label">Nazwa użytkownika:</label>
                <input type="text" id="registerUsername" class="form-input" placeholder="np. jan_kowalski" autocomplete="username">
                <div style="font-size: 10px; color: #888; margin-top: 3px;">Tylko litery, cyfry i podkreślniki</div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Hasło:</label>
                <input type="password" id="registerPassword" class="form-input" placeholder="Minimum 4 znaki" autocomplete="new-password">
            </div>
            
            <div class="form-group">
                <label class="form-label">Powtórz hasło:</label>
                <input type="password" id="registerPasswordConfirm" class="form-input" placeholder="Powtórz hasło" autocomplete="new-password">
            </div>
            
            <div class="form-group">
                <label class="form-label">Wyświetlana nazwa (opcjonalnie):</label>
                <input type="text" id="registerDisplayName" class="form-input" placeholder="np. Jan Kowalski">
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="showLoginForm()">Powrót do logowania</button>
                <button class="btn btn-primary" onclick="handleRegister()">Utwórz konto</button>
            </div>
        </div>
    `;
    
    document.getElementById('registerUsername').focus();
    
    // Enter key navigation
    document.getElementById('registerUsername').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('registerPassword').focus();
        }
    });
    
    document.getElementById('registerPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('registerPasswordConfirm').focus();
        }
    });
    
    document.getElementById('registerPasswordConfirm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('registerDisplayName').focus();
        }
    });
    
    document.getElementById('registerDisplayName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleRegister();
        }
    });
}

function showLoginForm() {
    hideLoginModal();
    showLoginModal();
}

function updateExistingUsersList() {
    const container = document.getElementById('existingUsers');
    if (!container) return;
    
    const users = window.userManager.getAllUsers();
    if (users.length === 0) {
        container.textContent = 'Brak użytkowników - utwórz nowe konto';
        return;
    }
    
    container.innerHTML = users.map(user => 
        `<span style="margin-right: 10px; cursor: pointer; color: #4CAF50;" onclick="fillUsername('${user.username}')">${user.displayName || user.username}</span>`
    ).join('');
}

function fillUsername(username) {
    const input = document.getElementById('loginUsername');
    if (input) {
        input.value = username;
        input.focus();
    }
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const user = window.userManager.loginUser(username, password);
        hideLoginModal();
        showUserInfo(user);
        
        // Przeładuj dane dla zalogowanego użytkownika
        if (window.supabaseSync) {
            window.supabaseSync.userId = user.userId;
            window.supabaseSync.syncFromCloud();
        }
        
        // Odśwież interfejs
        setTimeout(() => {
            if (window.loadFromLocalStorage) {
                window.loadFromLocalStorage();
                window.renderEntries();
            }
        }, 1000);
        
    } catch (error) {
        alert(error.message);
        // Wyczyść hasło przy błędzie
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
    }
}

function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const displayName = document.getElementById('registerDisplayName').value;
    
    // Walidacja haseł
    if (password !== passwordConfirm) {
        alert('Hasła nie są identyczne');
        document.getElementById('registerPasswordConfirm').focus();
        return;
    }
    
    try {
        const user = window.userManager.createUser(username, displayName, password);
        window.userManager.loginUser(username, password);
        hideLoginModal();
        showUserInfo(user);
        
        // Ustaw nowego użytkownika w Supabase
        if (window.supabaseSync) {
            window.supabaseSync.userId = user.userId;
        }
        
        alert(`Witaj ${user.displayName}! Twoje konto zostało utworzone.`);
        
    } catch (error) {
        alert(error.message);
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.remove();
    }
}

function showUserInfo(user) {
    // Dodaj informację o użytkowniku do nagłówka
    const header = document.querySelector('.header');
    if (header) {
        let userInfo = document.getElementById('userInfo');
        if (!userInfo) {
            userInfo = document.createElement('div');
            userInfo.id = 'userInfo';
            userInfo.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 10px; text-align: center;';
            header.appendChild(userInfo);
        }
        
        userInfo.innerHTML = `
            👤 Zalogowany jako: <strong style="color: #4CAF50;">${user.displayName}</strong>
            <button onclick="handleLogout()" style="margin-left: 10px; background: none; border: 1px solid #444; color: #ccc; padding: 2px 6px; border-radius: 2px; cursor: pointer; font-size: 10px;">Wyloguj</button>
            <button onclick="showUserManagement()" style="margin-left: 5px; background: none; border: 1px solid #444; color: #ccc; padding: 2px 6px; border-radius: 2px; cursor: pointer; font-size: 10px;">Zarządzaj</button>
            <button onclick="showChangePasswordModal()" style="margin-left: 5px; background: none; border: 1px solid #444; color: #ccc; padding: 2px 6px; border-radius: 2px; cursor: pointer; font-size: 10px;">Zmień hasło</button>
        `;
    }
}

function handleLogout() {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
        window.userManager.logoutUser();
        
        // Wyczyść interfejs
        const userInfo = document.getElementById('userInfo');
        if (userInfo) userInfo.remove();
        
        // Wyczyść dane w pamięci
        localStorage.removeItem('traderDiary');
        localStorage.removeItem('traderRulesSetups');
        
        // Pokaż modal logowania
        showLoginModal();
        
        // Wyczyść interfejs
        if (window.renderEntries) {
            entries = [];
            window.renderEntries();
        }
    }
}

function showUserManagement() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h3 class="modal-title">👥 Zarządzanie użytkownikami</h3>
            
            <div id="usersList" style="max-height: 300px; overflow-y: auto;"></div>
            
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Zamknij</button>
                <button class="btn btn-primary" onclick="showRegisterForm(); this.parentElement.parentElement.parentElement.remove();">Dodaj użytkownika</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    updateUsersList();
}

function updateUsersList() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    const users = window.userManager.getAllUsers();
    const currentUser = window.userManager.getCurrentUser();
    
    container.innerHTML = users.map(user => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 5px; background-color: #0a0a0a; border-radius: 3px; border: 1px solid #333;">
            <div>
                <div style="font-size: 12px; color: #fff;">${user.displayName}</div>
                <div style="font-size: 10px; color: #888;">@${user.username} • Utworzony: ${new Date(user.createdAt).toLocaleDateString()}</div>
                ${user.username === currentUser?.username ? '<div style="font-size: 10px; color: #4CAF50;">🟢 Aktualnie zalogowany</div>' : ''}
            </div>
            <div>
                ${user.username !== currentUser?.username ? 
                    `<button onclick="switchUser('${user.username}')" style="background: #333; border: 1px solid #555; color: #ccc; padding: 3px 8px; border-radius: 2px; cursor: pointer; font-size: 10px; margin-right: 5px;">Przełącz</button>` : ''
                }
                ${users.length > 1 ? 
                    `<button onclick="deleteUserConfirm('${user.username}')" style="background: #444; border: 1px solid #666; color: #f44336; padding: 3px 8px; border-radius: 2px; cursor: pointer; font-size: 10px;">Usuń</button>` : ''
                }
            </div>
        </div>
    `).join('');
}

function switchUser(username) {
    // Dla bezpieczeństwa, wymagaj hasła przy przełączaniu
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 350px;">
            <h3 class="modal-title">🔐 Potwierdź hasło</h3>
            
            <div class="form-group">
                <label class="form-label">Hasło użytkownika "${username}":</label>
                <input type="password" id="switchPassword" class="form-input" placeholder="Wpisz hasło" autocomplete="current-password">
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Anuluj</button>
                <button class="btn btn-primary" onclick="confirmSwitchUser('${username}')">Przełącz</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('switchPassword').focus();
    
    // Enter key
    document.getElementById('switchPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmSwitchUser(username);
        }
    });
}

function confirmSwitchUser(username) {
    const password = document.getElementById('switchPassword').value;
    
    try {
        const user = window.userManager.loginUser(username, password);
        
        // Zamknij wszystkie modale
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
        
        // Zaktualizuj interfejs
        showUserInfo(user);
        
        // Przeładuj dane dla nowego użytkownika
        if (window.supabaseSync) {
            window.supabaseSync.userId = user.userId;
            window.supabaseSync.syncFromCloud();
        }
        
        // Wyczyść i przeładuj interfejs
        setTimeout(() => {
            if (window.loadFromLocalStorage) {
                window.loadFromLocalStorage();
                window.renderEntries();
            }
        }, 1000);
        
        alert(`Przełączono na użytkownika: ${user.displayName}`);
        
    } catch (error) {
        alert(error.message);
        document.getElementById('switchPassword').value = '';
        document.getElementById('switchPassword').focus();
    }
}

function showChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3 class="modal-title">🔑 Zmiana hasła</h3>
            
            <div class="form-group">
                <label class="form-label">Obecne hasło:</label>
                <input type="password" id="currentPassword" class="form-input" placeholder="Wpisz obecne hasło" autocomplete="current-password">
            </div>
            
            <div class="form-group">
                <label class="form-label">Nowe hasło:</label>
                <input type="password" id="newPassword" class="form-input" placeholder="Minimum 4 znaki" autocomplete="new-password">
            </div>
            
            <div class="form-group">
                <label class="form-label">Powtórz nowe hasło:</label>
                <input type="password" id="newPasswordConfirm" class="form-input" placeholder="Powtórz nowe hasło" autocomplete="new-password">
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Anuluj</button>
                <button class="btn btn-primary" onclick="handleChangePassword()">Zmień hasło</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('currentPassword').focus();
    
    // Enter key navigation
    document.getElementById('currentPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('newPassword').focus();
        }
    });
    
    document.getElementById('newPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('newPasswordConfirm').focus();
        }
    });
    
    document.getElementById('newPasswordConfirm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleChangePassword();
        }
    });
}

function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordConfirm = document.getElementById('newPasswordConfirm').value;
    
    if (newPassword !== newPasswordConfirm) {
        alert('Nowe hasła nie są identyczne');
        document.getElementById('newPasswordConfirm').focus();
        return;
    }
    
    try {
        const currentUser = window.userManager.getCurrentUser();
        window.userManager.changePassword(currentUser.username, currentPassword, newPassword);
        
        // Zamknij modal
        document.querySelector('.modal').remove();
        
        alert('Hasło zostało zmienione pomyślnie!');
        
    } catch (error) {
        alert(error.message);
        if (error.message.includes('stare hasło')) {
            document.getElementById('currentPassword').value = '';
            document.getElementById('currentPassword').focus();
        }
    }
}

function deleteUserConfirm(username) {
    const user = window.userManager.users[username];
    if (!user) return;
    
    if (confirm(`Czy na pewno chcesz usunąć użytkownika "${user.displayName}"?\n\nTo spowoduje utratę wszystkich jego danych!`)) {
        const wasCurrentUser = window.userManager.currentUser?.username === username;
        window.userManager.deleteUser(username);
        
        if (wasCurrentUser) {
            // Jeśli usunęliśmy aktualnego użytkownika
            const userInfo = document.getElementById('userInfo');
            if (userInfo) userInfo.remove();
            
            localStorage.removeItem('traderDiary');
            localStorage.removeItem('traderRulesSetups');
            
            // Zamknij modal i pokaż logowanie
            const modal = document.querySelector('.modal');
            if (modal) modal.remove();
            
            showLoginModal();
            
            if (window.renderEntries) {
                entries = [];
                window.renderEntries();
            }
        } else {
            // Tylko odśwież listę
            updateUsersList();
        }
    }
}

// Inicjalizacja przy starcie
function initializeUserSystem() {
    const currentUser = window.userManager.getCurrentUser();
    
    if (currentUser) {
        // Użytkownik jest zalogowany
        showUserInfo(currentUser);
        
        // Ustaw userId w Supabase
        if (window.supabaseSync) {
            window.supabaseSync.userId = currentUser.userId;
        }
    } else {
        // Brak zalogowanego użytkownika
        setTimeout(() => {
            showLoginModal();
        }, 500);
    }
}

// Auto-inicjalizacja
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeUserSystem, 100);
});

// Eksportuj funkcje do globalnego zasięgu
window.showLoginModal = showLoginModal;
window.handleLogout = handleLogout;
window.showUserManagement = showUserManagement;
window.showChangePasswordModal = showChangePasswordModal;