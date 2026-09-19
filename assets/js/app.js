// AgriPulse Shared Interactive Utilities
document.addEventListener('DOMContentLoaded', async () => {
  // First immediately restore the session identity for instantaneous visual feedback
  const userName = sessionStorage.getItem('agripulse_user_name');
  if (userName) {
    document.querySelectorAll('.farmer-display-name, .buyer-display-name').forEach(el => {
      el.textContent = userName;
    });
  }

  // Handle session identity display securely using JWT token in the background
  const token = sessionStorage.getItem('token');
  const currentPath = window.location.pathname;

  if (token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Strict Role-Based Routing Guard
        const role = data.user.role;

        if (currentPath.includes('/farmer/') && role !== 'FARMER') {
          window.location.href = '../buyer/dashboard.html';
          return;
        } else if (currentPath.includes('/buyer/') && role !== 'BUYER') {
          window.location.href = '../farmer/dashboard.html';
          return;
        }

        // Update both header profiles and sidebar operating-as names with authoritative backend data
        document.querySelectorAll('.farmer-display-name, .buyer-display-name').forEach(el => {
          el.textContent = data.user.name;
        });
        document.querySelectorAll('.fpo-display-name').forEach(el => {
          if (data.user.farmerProfile && data.user.farmerProfile.fpoName) {
            el.textContent = data.user.farmerProfile.fpoName;
          } else if (data.user.buyerProfile && data.user.buyerProfile.companyName) {
            el.textContent = data.user.buyerProfile.companyName;
          } else {
            el.textContent = data.user.name;
          }
        });
        
      // Set location if present
      const locTextEl = document.getElementById('user-location-text');
      if (locTextEl) {
        let state = null;
        let city = null;
        if (data.user.role === 'FARMER' && data.user.farmerProfile) {
          state = data.user.farmerProfile.state;
          city = data.user.farmerProfile.city;
        } else if (data.user.role === 'BUYER' && data.user.buyerProfile) {
          state = data.user.buyerProfile.state;
          city = data.user.buyerProfile.city;
        }
        
        if (state && city) {
          locTextEl.textContent = `📍 ${city}, ${state}`;
        } else {
          locTextEl.textContent = '📍 Location not set';
        }
      }

      // Keep sessionStorage updated
        sessionStorage.setItem('agripulse_user_name', data.user.name);
      } else {
        sessionStorage.removeItem('token');
        if (currentPath.includes('/farmer/')) {
          window.location.href = '../farmer-login.html';
        } else if (currentPath.includes('/buyer/')) {
          window.location.href = '../buyer-login.html';
        }
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
      sessionStorage.removeItem('token');
      if (currentPath.includes('/farmer/')) {
        window.location.href = '../farmer-login.html';
      } else if (currentPath.includes('/buyer/')) {
        window.location.href = '../buyer-login.html';
      }
    }
  } else {
    if (currentPath.includes('/farmer/')) {
      window.location.href = '../farmer-login.html';
    } else if (currentPath.includes('/buyer/')) {
      window.location.href = '../buyer-login.html';
    }
  }

  // Setup Toast System
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Bind all demo action buttons with feedback
  document.querySelectorAll('[data-toast]').forEach(el => {
    el.addEventListener('click', (e) => {
      const msg = el.getAttribute('data-toast') || 'Action completed successfully';
      showToast(msg);
    });
  });

  // Mobile Drawer Toggle
  const drawerBtn = document.getElementById('drawerOpenBtn') || document.querySelector('[data-drawer-toggle]');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const sideDrawer = document.getElementById('sideDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  if (drawerBtn && sideDrawer && drawerOverlay) {
    drawerBtn.addEventListener('click', () => {
      sideDrawer.classList.remove('-translate-x-full');
      drawerOverlay.classList.remove('opacity-0', 'pointer-events-none');
    });
  }

  if (drawerCloseBtn && sideDrawer && drawerOverlay) {
    drawerCloseBtn.addEventListener('click', () => {
      sideDrawer.classList.add('-translate-x-full');
      drawerOverlay.classList.add('opacity-0', 'pointer-events-none');
    });
  }

  if (drawerOverlay && sideDrawer) {
    drawerOverlay.addEventListener('click', () => {
      sideDrawer.classList.add('-translate-x-full');
      drawerOverlay.classList.add('opacity-0', 'pointer-events-none');
    });
  }
});

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = 'agripulse-toast';
  
  let icon = 'info';
  let iconColor = 'text-blue-400';
  
  if (type === 'success') {
    icon = 'check_circle';
    iconColor = 'text-emerald-400';
  } else if (type === 'error') {
    icon = 'error';
    iconColor = 'text-rose-400';
  } else if (type === 'warning') {
    icon = 'warning';
    iconColor = 'text-amber-400';
  }

  toast.innerHTML = `
    <span class="material-symbols-outlined ${iconColor} text-lg">${icon}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.showToast = showToast;

window.logout = function() {
  const currentPath = window.location.pathname;
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('agripulse_user_name');
  sessionStorage.removeItem('agripulse_user_role');
  sessionStorage.removeItem('agripulse_user_avatar');
  
  if (currentPath.includes('/farmer/')) {
    window.location.href = '../farmer-login.html';
  } else if (currentPath.includes('/buyer/')) {
    window.location.href = '../buyer-login.html';
  } else {
    window.location.href = '../login.html';
  }
};

// Security: Prevent accessing protected pages via browser Back/Forward buttons after logout
window.addEventListener('pageshow', (event) => {
  const token = sessionStorage.getItem('token');
  const currentPath = window.location.pathname;
  
  // If no token is found on a protected page, force redirect immediately
  if (!token && (currentPath.includes('/farmer/') || currentPath.includes('/buyer/'))) {
    if (currentPath.includes('/farmer/')) {
      window.location.replace('../farmer-login.html');
    } else {
      window.location.replace('../buyer-login.html');
    }
  }
});
