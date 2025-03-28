const genericSizeChart = {
  'XS': { min: 30, max: 34 },
  'S': { min: 34, max: 37 },
  'M': { min: 37, max: 40 },
  'L': { min: 40, max: 43 },
  'XL': { min: 43, max: 46 },
  'XXL': { min: 46, max: 49 }
};

function findSizeInformation() {
  const sizeRelatedText = [
    'size chart',
    'size guide',
    'measurements',
    'dimensions',
    'fit guide',
    'sizing info',
    'size information'
  ];


  const possibleElements = [
    ...Array.from(document.querySelectorAll('table')),
    ...Array.from(document.querySelectorAll('[class*="size"]:not(select):not(option)')),
    ...Array.from(document.querySelectorAll('[id*="size"]:not(select):not(option)')),
    
    ...Array.from(document.querySelectorAll('button')),
    ...Array.from(document.querySelectorAll('a')),
    
    ...Array.from(document.querySelectorAll('.product-info')),
    ...Array.from(document.querySelectorAll('.product-details')),
    ...Array.from(document.querySelectorAll('.product-description'))
  ];

  for (const element of possibleElements) {
    const elementText = element.textContent.toLowerCase();
    
    if (sizeRelatedText.some(text => elementText.includes(text))) {
      let sizeContainer = element;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        if (sizeContainer.querySelector('table') || 
            sizeContainer.textContent.length > 100) {
          break;
        }
        sizeContainer = sizeContainer.parentElement;
        attempts++;
      }

      const sizeInfo = extractSizeInformation(sizeContainer);
      if (sizeInfo) {
        return sizeInfo;
      }
    }
  }

  const sizeOptions = findSizeOptions();
  if (sizeOptions.length > 0) {
    return {
      type: 'options',
      sizes: sizeOptions
    };
  }

  return null;
}

function extractSizeInformation(element) {
  if (!element) return null;

  const text = element.textContent;
  
  const measurements = {
    chest: findMeasurement(text, ['chest', 'bust', 'width']),
    shoulders: findMeasurement(text, ['shoulder', 'shoulders', 'yoke']),
    length: findMeasurement(text, ['length', 'height'])
  };

  if (Object.values(measurements).some(m => m !== null)) {
    return {
      type: 'measurements',
      data: measurements
    };
  }

  const sizeRanges = {};
  const sizePattern = /(XS|S|M|L|XL|XXL|XXXL)/gi;
  const matches = text.match(sizePattern);
  
  if (matches) {
    return {
      type: 'sizes',
      sizes: [...new Set(matches)]
    };
  }

  return null;
}

function findMeasurement(text, keywords) {
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[^\\d]*(\\d+(?:\\.\\d+)?)[^\\d]*(?:inches|"|in)?`, 'i');
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

function findSizeOptions() {
  const sizeSelectors = [
    'select[name*="size" i]',
    '[class*="size-select" i]',
    '[class*="size-option" i]',
    '[data-variant-type="size"]'
  ];

  const sizes = new Set();

  for (const selector of sizeSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element.tagName === 'SELECT') {
        Array.from(element.options).forEach(option => {
          const size = normalizeSizeOption(option.textContent);
          if (size) sizes.add(size);
        });
      } else {
        const size = normalizeSizeOption(element.textContent);
        if (size) sizes.add(size);
      }
    });
  }

  return Array.from(sizes);
}

function normalizeSizeOption(text) {
  const sizeMatch = text.match(/\b(XS|S|M|L|XL|XXL|XXXL)\b/i);
  return sizeMatch ? sizeMatch[1].toUpperCase() : null;
}

function recommendSize(measurements, sizeInfo) {
  if (!sizeInfo) {
    return recommendGenericSize(measurements);
  }

  switch (sizeInfo.type) {
    case 'measurements':
      return recommendFromMeasurements(measurements, sizeInfo.data);
    case 'sizes':
      return recommendFromSizeList(measurements, sizeInfo.sizes);
    case 'options':
      return recommendFromSizeList(measurements, sizeInfo.sizes);
    default:
      return recommendGenericSize(measurements);
  }
}

function recommendFromMeasurements(userMeasurements, chartMeasurements) {
  if (chartMeasurements.chest) {
    const chest = userMeasurements.chest;
    let bestSize = null;
    let smallestDiff = Infinity;

    for (const [size, range] of Object.entries(genericSizeChart)) {
      const midpoint = (range.min + range.max) / 2;
      const diff = Math.abs(chest - midpoint);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestSize = size;
      }
    }

    return {
      size: bestSize,
      explanation: 'Based on chest measurements from the size chart.'
    };
  }

  return recommendGenericSize(userMeasurements);
}

function recommendFromSizeList(measurements, availableSizes) {
  const recommendedGeneric = recommendGenericSize(measurements);
  
  if (availableSizes.includes(recommendedGeneric.size)) {
    return {
      size: recommendedGeneric.size,
      explanation: `${recommendedGeneric.explanation} This size is available.`
    };
  }

  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const recommendedIndex = sizeOrder.indexOf(recommendedGeneric.size);
  
  let closestSize = availableSizes[0];
  let smallestDiff = Infinity;

  availableSizes.forEach(size => {
    const diff = Math.abs(sizeOrder.indexOf(size) - recommendedIndex);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestSize = size;
    }
  });

  return {
    size: closestSize,
    explanation: `Based on your measurements, we recommend ${recommendedGeneric.size}, but it's not available. ${closestSize} is the closest available size.`
  };
}

function recommendGenericSize(measurements) {
  const { chest } = measurements;
  
  for (const [size, range] of Object.entries(genericSizeChart)) {
    if (chest >= range.min && chest < range.max) {
      return {
        size,
        explanation: 'Based on generic size chart (chest measurement).'
      };
    }
  }

  return {
    size: chest <= genericSizeChart.XS.min ? 'XS' : 'XXL',
    explanation: 'Based on generic size chart. This is an approximate recommendation.'
  };
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'FIND_SIZE') {
    const sizeInfo = findSizeInformation();
    const recommendation = recommendSize(request.measurements, sizeInfo);
    sendResponse(recommendation);
  }
  return true;
});