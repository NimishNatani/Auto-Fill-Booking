// Website selector
document.getElementById('websiteSelect').addEventListener('change', (e) => {
  const selected = e.target.value;
  
  // Hide all content
  document.getElementById('irctc-content').style.display = 'none';
  document.getElementById('other-content').style.display = 'none';
  
  // Show selected content
  if (selected === 'irctc') {
    document.getElementById('irctc-content').style.display = 'block';
  } else {
    document.getElementById('other-content').style.display = 'block';
  }
});

// ============================================================================
// PASSENGERS MANAGEMENT
// ============================================================================

async function loadPassengers() {
  const result = await chrome.storage.local.get(['passengers']);
  const passengers = result.passengers || [];
  
  const listEl = document.getElementById('passengerList');
  const countEl = document.getElementById('passengerCount');
  
  countEl.textContent = passengers.length;
  listEl.innerHTML = '';
  
  if (passengers.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><p>No passengers added yet</p></div>';
    return;
  }
  
  passengers.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'passenger-item';
    div.innerHTML = `
      <div class="passenger-info">
        <div class="passenger-name">${p.name}</div>
        <div class="passenger-details">${p.age} yrs • ${p.gender}${p.berth ? ' • ' + p.berth : ''}</div>
      </div>
      <button class="btn-danger" data-index="${index}">Delete</button>
    `;
    
    div.querySelector('button').addEventListener('click', () => deletePassenger(index));
    listEl.appendChild(div);
  });
}

document.getElementById('addPassengerBtn').addEventListener('click', () => {
  document.getElementById('passengerListView').style.display = 'none';
  document.getElementById('passengerForm').classList.add('active');
  
  // Clear form
  document.getElementById('passengerName').value = '';
  document.getElementById('passengerAge').value = '';
  document.getElementById('passengerGender').value = '';
  document.getElementById('passengerBerth').value = '';
});

document.getElementById('cancelPassengerBtn').addEventListener('click', () => {
  document.getElementById('passengerForm').classList.remove('active');
  document.getElementById('passengerListView').style.display = 'block';
});

document.getElementById('savePassengerBtn').addEventListener('click', async () => {
  const name = document.getElementById('passengerName').value.trim().toUpperCase();
  const age = document.getElementById('passengerAge').value.trim();
  const gender = document.getElementById('passengerGender').value;
  const berth = document.getElementById('passengerBerth').value;
  
  if (!name || !age || !gender) {
    showStatus('Please fill all required fields (Name, Age, Gender)', 'error');
    return;
  }
  
  if (age < 1 || age > 120) {
    showStatus('Please enter a valid age', 'error');
    return;
  }
  
  const result = await chrome.storage.local.get(['passengers']);
  const passengers = result.passengers || [];
  
  passengers.push({ name, age: parseInt(age), gender, berth });
  await chrome.storage.local.set({ passengers });
  
  document.getElementById('passengerForm').classList.remove('active');
  document.getElementById('passengerListView').style.display = 'block';
  
  showStatus('Passenger added successfully!', 'success');
  loadPassengers();
});

async function deletePassenger(index) {
  if (!confirm('Delete this passenger?')) return;
  
  const result = await chrome.storage.local.get(['passengers']);
  const passengers = result.passengers || [];
  
  passengers.splice(index, 1);
  await chrome.storage.local.set({ passengers });
  
  showStatus('Passenger deleted', 'success');
  loadPassengers();
}

// ============================================================================
// CONTACT DETAILS MANAGEMENT
// ============================================================================

async function loadContact() {
  const result = await chrome.storage.local.get(['contact']);
  const contact = result.contact || {};
  
  if (contact.mobile && contact.email) {
    document.getElementById('displayMobile').textContent = contact.mobile;
    document.getElementById('displayEmail').textContent = contact.email;
    document.getElementById('contactDisplay').style.display = 'block';
    document.getElementById('contactForm').style.display = 'none';
  } else {
    document.getElementById('contactDisplay').style.display = 'none';
    document.getElementById('contactForm').style.display = 'block';
    
    if (contact.mobile) document.getElementById('contactMobile').value = contact.mobile;
    if (contact.email) document.getElementById('contactEmail').value = contact.email;
  }
}

document.getElementById('editContactBtn').addEventListener('click', () => {
  document.getElementById('contactDisplay').style.display = 'none';
  document.getElementById('contactForm').style.display = 'block';
  
  // Load current values
  const mobile = document.getElementById('displayMobile').textContent;
  const email = document.getElementById('displayEmail').textContent;
  
  document.getElementById('contactMobile').value = mobile;
  document.getElementById('contactEmail').value = email;
});

document.getElementById('saveContactBtn').addEventListener('click', async () => {
  const mobile = document.getElementById('contactMobile').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  
  if (!mobile || !email) {
    showStatus('Please fill both mobile number and email', 'error');
    return;
  }
  
  if (!/^\d{10}$/.test(mobile)) {
    showStatus('Please enter a valid 10-digit mobile number', 'error');
    return;
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showStatus('Please enter a valid email address', 'error');
    return;
  }
  
  await chrome.storage.local.set({ contact: { mobile, email } });
  showStatus('Contact details saved successfully!', 'success');
  loadContact();
});

// ============================================================================
// PAYMENT DETAILS MANAGEMENT
// ============================================================================

async function loadPayment() {
  const result = await chrome.storage.local.get(['payment']);
  const payment = result.payment || {};
  
  if (payment.method) {
    let displayText = payment.method === 'UPI' ? 'BHIM/UPI' : 'Cards/Net Banking/Wallets';
    if (payment.method === 'UPI' && payment.upiId) {
      displayText += ` (${payment.upiId})`;
    }
    
    document.getElementById('displayPaymentMethod').textContent = displayText;
    document.getElementById('paymentDisplay').style.display = 'block';
    document.getElementById('paymentForm').style.display = 'none';
  } else {
    document.getElementById('paymentDisplay').style.display = 'none';
    document.getElementById('paymentForm').style.display = 'block';
  }
}

document.getElementById('paymentMethod').addEventListener('change', (e) => {
  const upiGroup = document.getElementById('upiIdGroup');
  if (e.target.value === 'UPI') {
    upiGroup.style.display = 'block';
  } else {
    upiGroup.style.display = 'none';
  }
});

document.getElementById('editPaymentBtn').addEventListener('click', async () => {
  document.getElementById('paymentDisplay').style.display = 'none';
  document.getElementById('paymentForm').style.display = 'block';
  
  // Load current values
  const result = await chrome.storage.local.get(['payment']);
  const payment = result.payment || {};
  
  if (payment.method) {
    document.getElementById('paymentMethod').value = payment.method;
    if (payment.method === 'UPI') {
      document.getElementById('upiIdGroup').style.display = 'block';
      document.getElementById('upiId').value = payment.upiId || '';
    }
  }
});

document.getElementById('savePaymentBtn').addEventListener('click', async () => {
  const method = document.getElementById('paymentMethod').value;
  
  if (!method) {
    showStatus('Please select a payment method', 'error');
    return;
  }
  
  const payment = { method };
  
  if (method === 'UPI') {
    const upiId = document.getElementById('upiId').value.trim();
    if (upiId) {
      payment.upiId = upiId;
    }
  }
  
  await chrome.storage.local.set({ payment });
  showStatus('Payment details saved successfully!', 'success');
  loadPayment();
});

// ============================================================================
// FILL FORM
// ============================================================================

document.getElementById('fillBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status-message');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('irctc.co.in')) {
      showStatus('Please open IRCTC booking page first', 'error');
      return;
    }
    
    const result = await chrome.storage.local.get(['passengers', 'contact', 'payment']);
    
    if (!result.passengers || result.passengers.length === 0) {
      showStatus('Please add at least one passenger first', 'error');
      return;
    }
    
    if (!result.contact || !result.contact.mobile || !result.contact.email) {
      showStatus('Please add contact details first', 'error');
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillForm',
      data: {
        passengers: result.passengers,
        contact: result.contact,
        payment: result.payment || {}
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error: Please refresh the IRCTC page and try again', 'error');
      } else if (response && response.success) {
        showStatus('✓ Form filled successfully!', 'success');
      } else {
        showStatus(response?.message || 'Failed to fill form', 'error');
      }
    });
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

// ============================================================================
// INITIALIZE
// ============================================================================

loadPassengers();
loadContact();
loadPayment();