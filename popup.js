document.addEventListener('DOMContentLoaded', function() {
  // Load saved measurements
  chrome.storage.local.get(['measurements'], function(result) {
    if (result.measurements) {
      document.getElementById('chest').value = result.measurements.chest;
      document.getElementById('shoulders').value = result.measurements.shoulders;
      document.getElementById('length').value = result.measurements.length;
    }
  });

  document.getElementById('findSize').addEventListener('click', async function() {
    const measurements = {
      chest: parseFloat(document.getElementById('chest').value),
      shoulders: parseFloat(document.getElementById('shoulders').value),
      length: parseFloat(document.getElementById('length').value)
    };

    // Save measurements
    chrome.storage.local.set({ measurements });

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send measurements to content script
    chrome.tabs.sendMessage(tab.id, { type: 'FIND_SIZE', measurements }, function(response) {
      const resultDiv = document.getElementById('result');
      resultDiv.style.display = 'block';
      
      if (response && response.size) {
        resultDiv.innerHTML = `<strong>Recommended size: ${response.size}</strong><br>${response.explanation || ''}`;
      } else {
        resultDiv.textContent = 'Could not find size information on this page.';
      }
    });
  });
});