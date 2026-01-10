// ============================================================================
// EXTENSIBLE FORM FILLER ARCHITECTURE
// ============================================================================

// Base class for website-specific fillers
class WebsiteFiller {
  constructor() {
    this.name = 'Base Filler';
  }
  
  // Check if this filler can handle the current page
  canHandle() {
    return false;
  }
  
  // Wait for an element to appear
  async waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Element ${selector} not found`);
  }
  
  // Set input value and trigger events
  setInputValue(element, value) {
    if (!element) return false;
    
    element.focus();
    
    // For autocomplete inputs, we need to find the actual input inside
    let actualInput = element;
    if (element.tagName === 'P-AUTOCOMPLETE' || element.tagName === 'NG-AUTOCOMPLETE') {
      actualInput = element.querySelector('input') || element;
    }
    
    actualInput.value = value;
    
    // Trigger multiple events to ensure the website detects the change
    actualInput.dispatchEvent(new Event('input', { bubbles: true }));
    actualInput.dispatchEvent(new Event('change', { bubbles: true }));
    actualInput.dispatchEvent(new Event('blur', { bubbles: true }));
    actualInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    actualInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    return true;
  }
  
  // Select dropdown option
  selectOption(element, value) {
    if (!element) return false;
    
    element.focus();
    
    // Try to find the option by value or text
    for (let option of element.options) {
      if (option.value === value || option.text === value || option.text.includes(value)) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    
    return false;
  }
  
  // Click element safely
  clickElement(element) {
    if (!element) return false;
    element.click();
    return true;
  }
  
  // Main fill method - to be overridden by specific implementations
  async fill(data) {
    throw new Error('fill() method must be implemented by subclass');
  }
}

// ============================================================================
// IRCTC SPECIFIC IMPLEMENTATION
// ============================================================================

class IRCTCFiller extends WebsiteFiller {
  constructor() {
    super();
    this.name = 'IRCTC Filler';
  }
  
  canHandle() {
    return window.location.hostname.includes('irctc.co.in');
  }
  
  async fill(data) {
    const { passengers, contact, payment } = data;
    const results = [];
    
    try {
      // Wait a bit for the page to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      results.push('=== Starting IRCTC Form Fill ===');
      results.push(`Passengers to fill: ${passengers.length}`);
      
      // STEP 1: Add passenger forms if needed
      await this.addPassengerForms(passengers.length, results);
      
      // Wait for forms to load
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // STEP 2: Fill passenger details
      await this.fillPassengerDetails(passengers, results);
      
      // STEP 3: Fill contact details
      await this.fillContactDetails(contact, results);
      
      // STEP 4: Fill payment details (if provided)
      if (payment && payment.method) {
        await this.fillPaymentDetails(payment, results);
      }
      
      // STEP 5: Auto-click Continue button
      await this.clickContinueButton(results);
      
      console.log('IRCTC AutoFill Results:\n' + results.join('\n'));
      
      return {
        success: true,
        message: 'Form filled successfully!',
        details: results
      };
      
    } catch (error) {
      console.error('IRCTC AutoFill Error:', error);
      return {
        success: false,
        message: 'Error: ' + error.message,
        details: results
      };
    }
  }
  
  // Add passenger forms by clicking the "Add Passenger" button
  async addPassengerForms(requiredCount, results) {
    results.push('\n=== Adding Passenger Forms ===');
    
    // Count existing passenger forms
    let existingForms = document.querySelectorAll('p-autocomplete[formcontrolname="passengerName"]').length;
    if (existingForms === 0) {
      existingForms = document.querySelectorAll('input[formcontrolname="passengerAge"]').length;
    }
    
    results.push(`Existing forms: ${existingForms}`);
    results.push(`Required forms: ${requiredCount}`);
    
    if (existingForms >= requiredCount) {
      results.push('✓ Sufficient passenger forms already present');
      return;
    }
    
    // Find the "Add Passenger" button
    const addPassengerBtn = Array.from(document.querySelectorAll('button, a')).find(btn => {
      const text = btn.textContent.trim().toLowerCase();
      return text.includes('add passenger') || text.includes('add infant');
    });
    
    if (!addPassengerBtn) {
      results.push('✗ Add Passenger button not found');
      results.push('⚠ Please manually add passenger forms first');
      return;
    }
    
    results.push(`✓ Add Passenger button found: "${addPassengerBtn.textContent.trim()}"`);
    
    // Click the button multiple times to add forms
    const formsToAdd = requiredCount - existingForms;
    for (let i = 0; i < formsToAdd; i++) {
      results.push(`Adding passenger form ${existingForms + i + 1}...`);
      addPassengerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    results.push(`✓ Added ${formsToAdd} passenger form(s)`);
  }
  
  // Fill passenger details
  async fillPassengerDetails(passengers, results) {
    results.push('\n=== Filling Passenger Details ===');
    
    // Try multiple ways to find passenger sections
    let allPassengerSections = document.querySelectorAll('app-passenger-list .passengerrow');
    if (allPassengerSections.length === 0) {
      allPassengerSections = document.querySelectorAll('app-passenger-list > div > div');
    }
    if (allPassengerSections.length === 0) {
      allPassengerSections = document.querySelectorAll('.passenger-detail-section');
    }
    
    results.push(`Found ${allPassengerSections.length} passenger sections`);
    
    if (allPassengerSections.length === 0) {
      // If no sections found, try finding inputs directly
      const nameInputs = document.querySelectorAll('input[formcontrolname="passengerName"]');
      const ageInputs = document.querySelectorAll('input[formcontrolname="passengerAge"]');
      const genderSelects = document.querySelectorAll('select[formcontrolname="passengerGender"]');
      const nameAutocompletes = document.querySelectorAll('p-autocomplete[formcontrolname="passengerName"]');
      
      results.push(`Direct field search:`);
      results.push(`- Name autocompletes: ${nameAutocompletes.length}`);
      results.push(`- Name inputs: ${nameInputs.length}`);
      results.push(`- Age inputs: ${ageInputs.length}`);
      results.push(`- Gender selects: ${genderSelects.length}`);
      
      // Fill directly by index
      for (let i = 0; i < passengers.length; i++) {
        const passenger = passengers[i];
        const passengerNum = i + 1;
        
        results.push(`\nFilling passenger ${passengerNum}: ${passenger.name}`);
        
        // Fill name - try autocomplete first, then regular input
        let nameFilled = false;
        if (nameAutocompletes[i]) {
          const autoInput = nameAutocompletes[i].querySelector('input');
          if (autoInput) {
            this.setInputValue(autoInput, passenger.name);
            results.push(`✓ Name filled (via autocomplete)`);
            nameFilled = true;
          }
        }
        if (!nameFilled && nameInputs[i]) {
          this.setInputValue(nameInputs[i], passenger.name);
          results.push(`✓ Name filled (via input)`);
          nameFilled = true;
        }
        if (!nameFilled) {
          results.push(`✗ Name field not found`);
        }
        
        // Fill age
        if (ageInputs[i]) {
          this.setInputValue(ageInputs[i], passenger.age.toString());
          results.push(`✓ Age filled`);
        }
        
        // Fill gender
        if (genderSelects[i]) {
          let genderValue = passenger.gender;
          if (passenger.gender.toLowerCase() === 'male') genderValue = 'M';
          if (passenger.gender.toLowerCase() === 'female') genderValue = 'F';
          if (passenger.gender.toLowerCase() === 'transgender') genderValue = 'T';
          
          this.selectOption(genderSelects[i], genderValue);
          results.push(`✓ Gender filled (${genderValue})`);
        }
        
        // Fill berth
        const berthSelects = document.querySelectorAll('select[formcontrolname="passengerBerthChoice"]');
        if (passenger.berth && berthSelects[i]) {
          this.selectOption(berthSelects[i], passenger.berth);
          results.push(`✓ Berth preference filled`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } else {
      // Fill using sections
      for (let i = 0; i < passengers.length && i < allPassengerSections.length; i++) {
        const passenger = passengers[i];
        const passengerNum = i + 1;
        const section = allPassengerSections[i];
        
        results.push(`\nFilling passenger ${passengerNum}: ${passenger.name}`);
        
        // Find fields within this passenger section
        const nameInput = section.querySelector('input[formcontrolname="passengerName"]');
        const ageInput = section.querySelector('input[formcontrolname="passengerAge"]');
        const genderSelect = section.querySelector('select[formcontrolname="passengerGender"]');
        const berthSelect = section.querySelector('select[formcontrolname="passengerBerthChoice"]');
        
        // Fill name
        if (nameInput) {
          this.setInputValue(nameInput, passenger.name);
          results.push(`✓ Name filled`);
        } else {
          results.push(`✗ Name field not found`);
        }
        
        // Fill age
        if (ageInput) {
          this.setInputValue(ageInput, passenger.age.toString());
          results.push(`✓ Age filled`);
        } else {
          results.push(`✗ Age field not found`);
        }
        
        // Fill gender
        if (genderSelect) {
          let genderValue = passenger.gender;
          if (passenger.gender.toLowerCase() === 'male') genderValue = 'M';
          if (passenger.gender.toLowerCase() === 'female') genderValue = 'F';
          if (passenger.gender.toLowerCase() === 'transgender') genderValue = 'T';
          
          this.selectOption(genderSelect, genderValue);
          results.push(`✓ Gender filled (${genderValue})`);
        } else {
          results.push(`✗ Gender field not found`);
        }
        
        // Fill berth preference
        if (passenger.berth && berthSelect) {
          this.selectOption(berthSelect, passenger.berth);
          results.push(`✓ Berth preference filled`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  // Fill contact details
  async fillContactDetails(contact, results) {
    results.push('\n=== Filling Contact Details ===');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Find mobile input
    const mobileInput = document.querySelector('input[formcontrolname="mobileNumber"]') ||
                       document.querySelector('input[formcontrolname="mobileNo"]') ||
                       document.querySelector('input[placeholder*="Mobile"]') ||
                       document.querySelector('input[placeholder*="mobile"]') ||
                       document.querySelector('input[id*="mobile"]') ||
                       document.querySelector('input[type="tel"]');
    
    // Find email input
    let emailInput = document.querySelector('input[formcontrolname="email"]') ||
                    document.querySelector('input[formcontrolname="emailId"]');
    
    if (!emailInput) {
      const allInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
      for (let input of allInputs) {
        const placeholder = (input.placeholder || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        if (placeholder.includes('email') || id.includes('email') || name.includes('email')) {
          emailInput = input;
          break;
        }
      }
    }
    
    results.push(`Mobile input found: ${!!mobileInput}`);
    results.push(`Email input found: ${!!emailInput}`);
    
    // Fill mobile
    if (mobileInput) {
      const currentValue = mobileInput.value.trim();
      if (currentValue && currentValue.length > 0) {
        results.push(`⚠ Mobile already filled: ${currentValue} (keeping existing)`);
      } else {
        this.setInputValue(mobileInput, contact.mobile);
        results.push('✓ Mobile number filled');
      }
    } else {
      results.push('✗ Mobile number field not found');
    }
    
    // Fill email
    if (emailInput) {
      const currentValue = emailInput.value.trim();
      if (currentValue && currentValue.length > 0) {
        results.push(`⚠ Email already filled: ${currentValue} (keeping existing)`);
      } else {
        this.setInputValue(emailInput, contact.email);
        results.push('✓ Email filled');
      }
    } else {
      results.push('⚠ Email field not found (may be pre-filled from login)');
    }
  }
  
  // Fill payment details
  async fillPaymentDetails(payment, results) {
    results.push('\n=== Filling Payment Details ===');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const paymentMethod = payment.method;
      results.push(`Payment method: ${paymentMethod}`);
      
      // Find all payment radio buttons using p-radiobutton
      const allPaymentRadios = document.querySelectorAll('p-radiobutton[formcontrolname="paymentType"] input[type="radio"]');
      results.push(`Found ${allPaymentRadios.length} payment radio buttons`);
      
      let paymentRadio = null;
      let radioContainer = null;
      
      if (paymentMethod === 'UPI' || paymentMethod === 'BHIM/UPI') {
        // Find BHIM/UPI radio button (id="2")
        for (let radio of allPaymentRadios) {
          const id = radio.id;
          const value = radio.value;
          
          // Find the parent p-radiobutton element
          const pRadioButton = radio.closest('p-radiobutton');
          if (pRadioButton) {
            const label = pRadioButton.parentElement?.querySelector('label');
            const text = label?.textContent?.toLowerCase() || '';
            
            if (text.includes('bhim') || text.includes('upi') || id === '2' || value === '2') {
              paymentRadio = radio;
              radioContainer = pRadioButton;
              results.push(`Found UPI radio: id=${id}, value=${value}, text="${text.substring(0, 50)}"`);
              break;
            }
          }
        }
        
        if (paymentRadio) {
          // Check current state
          const ariaChecked = radioContainer?.getAttribute('aria-checked');
          results.push(`Current aria-checked: ${ariaChecked}`);
          
          if (ariaChecked !== 'true') {
            // Click the container div (the visual radio button)
            const radioButtonDiv = radioContainer?.querySelector('.ui-radiobutton-box');
            if (radioButtonDiv) {
              radioButtonDiv.click();
              results.push(`✓ Clicked radio button div`);
            }
            
            // Also click the actual input
            paymentRadio.click();
            
            // Set properties
            paymentRadio.checked = true;
            if (radioContainer) {
              radioContainer.setAttribute('aria-checked', 'true');
            }
            
            // Dispatch events
            paymentRadio.dispatchEvent(new Event('click', { bubbles: true }));
            paymentRadio.dispatchEvent(new Event('change', { bubbles: true }));
            paymentRadio.dispatchEvent(new Event('input', { bubbles: true }));
            
            results.push(`✓ BHIM/UPI selected (id=${paymentRadio.id})`);
            
            // Wait for UPI field
            await new Promise(resolve => setTimeout(resolve, 700));
            
            // Fill UPI ID
            if (payment.upiId) {
              const upiInput = document.querySelector('input[placeholder*="UPI"]') ||
                              document.querySelector('input[placeholder*="upi"]') ||
                              document.querySelector('input[formcontrolname*="upi"]');
              
              if (upiInput) {
                this.setInputValue(upiInput, payment.upiId);
                results.push(`✓ UPI ID filled: ${payment.upiId}`);
              } else {
                results.push(`⚠ UPI ID field not visible yet`);
              }
            }
          } else {
            results.push(`✓ BHIM/UPI already selected`);
          }
        }
      } else if (paymentMethod === 'Cards') {
        // Find Cards/Banking radio button (id="1")
        for (let radio of allPaymentRadios) {
          const id = radio.id;
          const value = radio.value;
          
          const pRadioButton = radio.closest('p-radiobutton');
          if (pRadioButton) {
            const label = pRadioButton.parentElement?.querySelector('label');
            const text = label?.textContent?.toLowerCase() || '';
            
            if (text.includes('credit') || text.includes('debit') || text.includes('card') || 
                text.includes('net banking') || text.includes('wallet') || 
                id === '1' || value === '1') {
              paymentRadio = radio;
              radioContainer = pRadioButton;
              break;
            }
          }
        }
        
        if (paymentRadio) {
          const ariaChecked = radioContainer?.getAttribute('aria-checked');
          
          if (ariaChecked !== 'true') {
            const radioButtonDiv = radioContainer?.querySelector('.ui-radiobutton-box');
            if (radioButtonDiv) {
              radioButtonDiv.click();
            }
            
            paymentRadio.click();
            paymentRadio.checked = true;
            if (radioContainer) {
              radioContainer.setAttribute('aria-checked', 'true');
            }
            
            paymentRadio.dispatchEvent(new Event('click', { bubbles: true }));
            paymentRadio.dispatchEvent(new Event('change', { bubbles: true }));
            paymentRadio.dispatchEvent(new Event('input', { bubbles: true }));
            
            results.push(`✓ Cards/Net Banking/Wallets selected (id=${paymentRadio.id})`);
          } else {
            results.push(`✓ Cards/Net Banking/Wallets already selected`);
          }
        }
      }
      
      if (!paymentRadio) {
        results.push(`⚠ Payment option not found`);
        results.push(`Available options:`);
        allPaymentRadios.forEach(radio => {
          const pRadioButton = radio.closest('p-radiobutton');
          const label = pRadioButton?.parentElement?.querySelector('label');
          results.push(`  - ${label?.textContent?.trim()} (id=${radio.id})`);
        });
      }
      
    } catch (error) {
      results.push(`✗ Error: ${error.message}`);
    }
  }
  
  // Auto-click Continue button
  async clickContinueButton(results) {
    results.push('\n=== Auto-clicking Continue Button ===');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // The Continue button in the HTML has specific structure:
      // <button class="mob-bot-btn search_btn" type="submit">
      //   It's in the right div: <div class="pull-right">
      
      // First try: Find button with exact classes in the right section
      let continueBtn = document.querySelector('div.pull-right button.mob-bot-btn.search_btn[type="submit"]');
      
      // Second try: Find by searching all buttons in pull-right div
      if (!continueBtn) {
        const rightDiv = document.querySelector('div.pull-right');
        if (rightDiv) {
          continueBtn = rightDiv.querySelector('button[type="submit"]');
          if (continueBtn) {
            results.push(`Found Continue button in pull-right div`);
          }
        }
      }
      
      // Third try: Find button with "Continue" text in pull-right
      if (!continueBtn) {
        const rightDiv = document.querySelector('div.pull-right');
        if (rightDiv) {
          const buttons = rightDiv.querySelectorAll('button');
          continueBtn = Array.from(buttons).find(btn => {
            const text = btn.textContent.trim().toLowerCase();
            return text === 'continue' || text.includes('continue');
          });
        }
      }
      
      // Fourth try: Find any button with Continue text (but avoid the price button on left)
      if (!continueBtn) {
        const allButtons = document.querySelectorAll('button');
        const continueButtons = Array.from(allButtons).filter(btn => {
          const text = btn.textContent.trim().toLowerCase();
          return text === 'continue' || text.includes('continue');
        });
        
        // If multiple found, take the last one (usually the submit button on right)
        if (continueButtons.length > 0) {
          continueBtn = continueButtons[continueButtons.length - 1];
          results.push(`Found Continue button (${continueButtons.length} candidates, using last one)`);
        }
      }
      
      if (continueBtn) {
        const isDisabled = continueBtn.disabled || continueBtn.hasAttribute('disabled');
        const buttonText = continueBtn.textContent.trim();
        const buttonClasses = continueBtn.className;
        
        results.push(`Button found: "${buttonText}"`);
        results.push(`Button classes: ${buttonClasses}`);
        results.push(`Button disabled: ${isDisabled}`);
        
        if (isDisabled) {
          results.push(`⚠ Continue button is disabled`);
          results.push(`Please verify all fields are correct`);
        } else {
          // Scroll into view
          continueBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Click it
          continueBtn.click();
          results.push(`✓ Continue button clicked!`);
        }
      } else {
        results.push(`✗ Continue button not found`);
        results.push(`Please click Continue manually`);
        
        // Debug info
        const allButtons = document.querySelectorAll('button');
        results.push(`Total buttons on page: ${allButtons.length}`);
      }
      
    } catch (error) {
      results.push(`✗ Error: ${error.message}`);
    }
  }
}

// ============================================================================
// WEBSITE FILLER REGISTRY
// ============================================================================

class FillerRegistry {
  constructor() {
    this.fillers = [];
    this.registerFiller(new IRCTCFiller());
  }
  
  registerFiller(filler) {
    this.fillers.push(filler);
  }
  
  getActiveFiller() {
    for (let filler of this.fillers) {
      if (filler.canHandle()) {
        return filler;
      }
    }
    return null;
  }
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

const registry = new FillerRegistry();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    const filler = registry.getActiveFiller();
    
    if (!filler) {
      sendResponse({
        success: false,
        message: 'This website is not supported yet'
      });
      return true;
    }
    
    console.log(`Using ${filler.name} to fill form`);
    
    filler.fill(request.data)
      .then(result => sendResponse(result))
      .catch(error => {
        sendResponse({
          success: false,
          message: error.message
        });
      });
    
    return true;
  }
});

console.log('Quick Book AutoFill content script loaded');