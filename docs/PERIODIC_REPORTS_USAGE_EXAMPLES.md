# Periodic Reports API Usage Examples

This document provides practical examples of how to use the periodic reports API endpoint.

## Endpoint

```
POST /hospitalizations/:id/periodic-reports
```

## Authentication

All requests require proper authentication headers:

```bash
Authorization: Bearer <your-jwt-token>
```

## Basic Usage Examples

### 1. Create a Simple Periodic Report

```bash
curl -X POST "http://localhost:8000/hospitalizations/abc12345/periodic-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "timestamp": "2024-01-16T10:00:00Z",
    "consciousnessStates": "AWAKE",
    "annotations": "Patient is alert and responsive"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Relatório periódico criado com sucesso"
}
```

### 2. Create a Detailed Periodic Report

```bash
curl -X POST "http://localhost:8000/hospitalizations/def67890/periodic-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "timestamp": "2024-01-16T14:30:00Z",
    "consciousnessStates": "AWAKE",
    "annotations": "Patient showing significant improvement. Responding well to treatment. More active than yesterday.",
    "feedingRecord": {
      "timeOfFeeding": "13:00",
      "foodType": "Prescribed recovery diet",
      "appetite": "Excellent - ate entire portion"
    },
    "physicalDischarges": [
      {
        "dischargeType": "Urination",
        "aspect": "Normal color and frequency"
      },
      {
        "dischargeType": "Defecation",
        "aspect": "Formed, normal consistency"
      }
    ]
  }'
```

### 3. Report for Different Consciousness States

#### Asleep Patient
```bash
curl -X POST "http://localhost:8000/hospitalizations/ghi11111/periodic-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "timestamp": "2024-01-16T22:00:00Z",
    "consciousnessStates": "ASLEEP",
    "annotations": "Patient sleeping peacefully. Vital signs stable."
  }'
```

#### Unconscious Patient
```bash
curl -X POST "http://localhost:8000/hospitalizations/jkl22222/periodic-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "timestamp": "2024-01-16T16:45:00Z",
    "consciousnessStates": "UNCONSCIOUS",
    "annotations": "Patient remains unconscious. Monitoring vital signs closely. IV fluids administered."
  }'
```

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
async function createPeriodicReport(hospitalizationId, reportData) {
  try {
    const response = await fetch(`/hospitalizations/${hospitalizationId}/periodic-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(reportData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create report');
    }

    const result = await response.json();
    console.log('Report created successfully:', result.message);
    return result;
  } catch (error) {
    console.error('Error creating periodic report:', error);
    throw error;
  }
}

// Usage
const reportData = {
  timestamp: new Date().toISOString(),
  consciousnessStates: "AWAKE",
  annotations: "Patient showing improvement",
  feedingRecord: {
    timeOfFeeding: "12:00",
    foodType: "Regular diet",
    appetite: "Good"
  }
};

createPeriodicReport("abc12345", reportData);
```

### Using Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

async function createPeriodicReport(hospitalizationId, reportData) {
  try {
    const response = await api.post(
      `/hospitalizations/${hospitalizationId}/periodic-reports`,
      reportData
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
```

## React Component Example

```jsx
import React, { useState } from 'react';

const PeriodicReportForm = ({ hospitalizationId, onSuccess }) => {
  const [formData, setFormData] = useState({
    consciousnessStates: 'AWAKE',
    annotations: '',
    feedingRecord: {
      timeOfFeeding: '',
      foodType: '',
      appetite: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const reportData = {
        ...formData,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`/hospitalizations/${hospitalizationId}/periodic-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const result = await response.json();
      onSuccess(result);

      // Reset form
      setFormData({
        consciousnessStates: 'AWAKE',
        annotations: '',
        feedingRecord: { timeOfFeeding: '', foodType: '', appetite: '' }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Consciousness State:</label>
        <select
          value={formData.consciousnessStates}
          onChange={(e) => setFormData({...formData, consciousnessStates: e.target.value})}
        >
          <option value="AWAKE">Awake</option>
          <option value="ASLEEP">Asleep</option>
          <option value="UNCONSCIOUS">Unconscious</option>
        </select>
      </div>

      <div>
        <label>Annotations:</label>
        <textarea
          value={formData.annotations}
          onChange={(e) => setFormData({...formData, annotations: e.target.value})}
          placeholder="Enter observations about the patient..."
        />
      </div>

      <div>
        <label>Feeding Time:</label>
        <input
          type="time"
          value={formData.feedingRecord.timeOfFeeding}
          onChange={(e) => setFormData({
            ...formData,
            feedingRecord: {...formData.feedingRecord, timeOfFeeding: e.target.value}
          })}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating Report...' : 'Create Report'}
      </button>
    </form>
  );
};
```

## Error Handling Examples

### Common Error Responses

#### Missing Hospitalization ID
```json
{
  "error": "ID da hospitalização é obrigatório"
}
```

#### Missing Timestamp
```json
{
  "error": "Timestamp é obrigatório"
}
```

#### Hospitalization Not Found
```json
{
  "error": "Hospitalization with id abc123 not found."
}
```

#### Inactive Hospitalization
```json
{
  "error": "Não é possível adicionar relatórios a uma hospitalização já finalizada"
}
```

#### Authorization Error
```json
{
  "error": "User does not have permission to perform this action"
}
```

### Error Handling in Code

```javascript
async function createReportWithErrorHandling(hospitalizationId, reportData) {
  try {
    const response = await fetch(`/hospitalizations/${hospitalizationId}/periodic-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new ValidationError(data.error);
        case 403:
          throw new AuthorizationError('You do not have permission to create reports');
        case 404:
          throw new NotFoundError('Hospitalization not found');
        case 500:
          throw new ServerError('Internal server error');
        default:
          throw new Error(data.error || 'Unknown error occurred');
      }
    }

    return data;
  } catch (error) {
    console.error('Failed to create periodic report:', error);

    // Handle different error types
    if (error instanceof ValidationError) {
      showValidationError(error.message);
    } else if (error instanceof AuthorizationError) {
      redirectToLogin();
    } else if (error instanceof NotFoundError) {
      showNotFoundMessage();
    } else {
      showGenericError();
    }

    throw error;
  }
}
```

## Testing Examples

### Unit Test Example (Jest)

```javascript
describe('Periodic Reports API', () => {
  test('should create periodic report successfully', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Relatório periódico criado com sucesso'
      })
    });
    global.fetch = mockFetch;

    const reportData = {
      timestamp: '2024-01-16T10:00:00Z',
      consciousnessStates: 'AWAKE',
      annotations: 'Test report'
    };

    const result = await createPeriodicReport('test-id', reportData);

    expect(mockFetch).toHaveBeenCalledWith(
      '/hospitalizations/test-id/periodic-reports',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(reportData)
      })
    );

    expect(result.success).toBe(true);
  });
});
```

## Best Practices

### 1. Always Include Timestamp
```javascript
// Good
const reportData = {
  timestamp: new Date().toISOString(),
  consciousnessStates: "AWAKE",
  annotations: "Patient observation"
};

// Bad - missing timestamp
const reportData = {
  consciousnessStates: "AWAKE",
  annotations: "Patient observation"
};
```

### 2. Validate Data Before Sending
```javascript
function validateReportData(data) {
  const errors = [];

  if (!data.timestamp) {
    errors.push('Timestamp is required');
  }

  if (!data.consciousnessStates) {
    errors.push('Consciousness state is required');
  }

  if (data.annotations && data.annotations.length > 1000) {
    errors.push('Annotations cannot exceed 1000 characters');
  }

  return errors;
}

// Usage
const errors = validateReportData(reportData);
if (errors.length > 0) {
  throw new Error(`Validation failed: ${errors.join(', ')}`);
}
```

### 3. Handle Network Errors
```javascript
async function createReportWithRetry(hospitalizationId, reportData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createPeriodicReport(hospitalizationId, reportData);
    } catch (error) {
      if (attempt === maxRetries || error.status < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## Integration with Forms

### HTML Form Example

```html
<form id="periodicReportForm">
  <div>
    <label for="consciousnessState">Consciousness State:</label>
    <select id="consciousnessState" name="consciousnessStates" required>
      <option value="">Select state</option>
      <option value="AWAKE">Awake</option>
      <option value="ASLEEP">Asleep</option>
      <option value="UNCONSCIOUS">Unconscious</option>
    </select>
  </div>

  <div>
    <label for="annotations">Observations:</label>
    <textarea
      id="annotations"
      name="annotations"
      maxlength="1000"
      placeholder="Enter your observations about the patient..."
    ></textarea>
  </div>

  <div>
    <label for="feedingTime">Feeding Time:</label>
    <input type="time" id="feedingTime" name="feedingTime">
  </div>

  <div>
    <label for="foodType">Food Type:</label>
    <input type="text" id="foodType" name="foodType" placeholder="e.g., Recovery diet">
  </div>

  <div>
    <label for="appetite">Appetite:</label>
    <select id="appetite" name="appetite">
      <option value="">Select appetite</option>
      <option value="Excellent">Excellent</option>
      <option value="Good">Good</option>
      <option value="Fair">Fair</option>
      <option value="Poor">Poor</option>
      <option value="None">None</option>
    </select>
  </div>

  <button type="submit">Create Report</button>
</form>

<script>
document.getElementById('periodicReportForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const reportData = {
    timestamp: new Date().toISOString(),
    consciousnessStates: formData.get('consciousnessStates'),
    annotations: formData.get('annotations') || '',
    feedingRecord: {
      timeOfFeeding: formData.get('feedingTime') || '',
      foodType: formData.get('foodType') || '',
      appetite: formData.get('appetite') || ''
    }
  };

  try {
    const result = await createPeriodicReport(
      window.currentHospitalizationId, // Set this globally
      reportData
    );
    alert('Report created successfully!');
    e.target.reset();
  } catch (error) {
    alert('Error creating report: ' + error.message);
  }
});
</script>
```

This documentation provides comprehensive examples for integrating with the periodic reports API endpoint in various scenarios and technologies.
