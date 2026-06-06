# OLJ API Reference Guide

## Base URL
```
Backend: http://localhost:5000/api
Frontend: http://localhost:5173
```

## Authentication Endpoints

### POST /auth/register
Create a new user or creator account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "user" // or "creator"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Errors:**
- 400: Missing fields, invalid format, weak password
- 409: Email or username already registered

---

### POST /auth/login
Log in to an existing account.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Notes:**
- Token is automatically set in httpOnly cookie `authToken`
- Cookie expires in 7 days
- Frontend sends cookies automatically with `withCredentials: true`

**Errors:**
- 400: Missing email or password
- 401: Invalid credentials

---

### POST /auth/logout
Log out the current user.

**Request:** No body required (uses cookie)

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### GET /auth/me
Get the current authenticated user's profile.

**Request:** No body (uses cookie authentication)

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- 401: No authentication token or invalid token
- 404: User not found

---

## Problem Endpoints

### POST /problems
Create a new coding problem. **Creator only.**

**Request:**
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
  "constraints": "1 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9",
  "difficulty": "Easy",
  "tags": ["array", "hash-table"],
  "sampleInput": "nums = [2,7,11,15], target = 9",
  "sampleOutput": "[0,1]",
  "authorCode": "function twoSum(nums, target) { /* solution */ }",
  "points": 50
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Problem created successfully.",
  "problem": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Two Sum",
    "difficulty": "Easy",
    "points": 50,
    "tags": ["array", "hash-table"],
    "authorId": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- 400: Missing required fields, invalid difficulty, invalid points range
- 401: Not authenticated
- 403: Only creators can create problems

---

### GET /problems
List all problems with optional filters.

**Query Parameters:**
- `difficulty`: "Easy" | "Medium" | "Hard"
- `tags`: comma-separated list (e.g., "array,hash-table")
- `search`: search in title and description
- `limit`: default 10, max results per page
- `skip`: default 0, pagination offset

**Example:** `/problems?difficulty=Easy&tags=array&limit=20&skip=0`

**Response (200):**
```json
{
  "success": true,
  "problems": [
    {
      "id": "507f1f77bcf86cd799439012",
      "title": "Two Sum",
      "description": "...",
      "difficulty": "Easy",
      "points": 50,
      "tags": ["array", "hash-table"],
      "authorId": {
        "id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "skip": 0
  }
}
```

---

### GET /problems/:id
Get problem details with sample test cases.

**Response (200):**
```json
{
  "success": true,
  "problem": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Two Sum",
    "description": "...",
    "difficulty": "Easy",
    "points": 50,
    "tags": ["array", "hash-table"],
    "sampleInput": "nums = [2,7,11,15], target = 9",
    "sampleOutput": "[0,1]",
    "authorCode": "function twoSum(nums, target) { /* solution */ }",
    "authorId": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "sampleTestCases": [
    {
      "id": "607f1f77bcf86cd799439013",
      "problemId": "507f1f77bcf86cd799439012",
      "inputData": "nums = [2,7,11,15], target = 9",
      "expectedOutput": "[0,1]",
      "isSample": true
    }
  ]
}
```

**Errors:**
- 400: Invalid problem ID format
- 404: Problem not found

---

### DELETE /problems/:id
Delete a problem. **Creator only, author must match.**

**Request:** No body

**Response (200):**
```json
{
  "success": true,
  "message": "Problem deleted successfully."
}
```

**Errors:**
- 400: Invalid problem ID format
- 401: Not authenticated
- 403: Only the problem author can delete it
- 404: Problem not found

---

## Contest Endpoints

### POST /contests
Create a new contest. **Creator only.**

**Request:**
```json
{
  "title": "Coding Challenge March 2024",
  "description": "Test your skills with 5 problems of varying difficulty",
  "startTime": "2024-03-15T10:00:00Z",
  "endTime": "2024-03-15T12:00:00Z",
  "problems": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Contest created successfully.",
  "contest": {
    "id": "607f1f77bcf86cd799439014",
    "title": "Coding Challenge March 2024",
    "description": "Test your skills with 5 problems of varying difficulty",
    "status": "upcoming",
    "startTime": "2024-03-15T10:00:00Z",
    "endTime": "2024-03-15T12:00:00Z",
    "creatorId": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "problems": [
      {
        "id": "507f1f77bcf86cd799439012",
        "title": "Two Sum",
        "difficulty": "Easy",
        "points": 50
      }
    ]
  }
}
```

**Validations:**
- startTime must be in the future
- endTime must be after startTime
- All problem IDs must exist

**Errors:**
- 400: Invalid date validation, missing fields
- 401: Not authenticated
- 403: Only creators can create contests

---

### GET /contests
List all contests with optional status filter.

**Query Parameters:**
- `status`: "upcoming" | "ongoing" | "completed"
- `limit`: default 10
- `skip`: default 0

**Response (200):**
```json
{
  "success": true,
  "contests": [
    {
      "id": "607f1f77bcf86cd799439014",
      "title": "Coding Challenge March 2024",
      "description": "...",
      "status": "upcoming",
      "startTime": "2024-03-15T10:00:00Z",
      "endTime": "2024-03-15T12:00:00Z",
      "creatorId": {
        "id": "507f1f77bcf86cd799439011",
        "username": "johndoe"
      },
      "problems": [
        {
          "id": "507f1f77bcf86cd799439012",
          "title": "Two Sum"
        }
      ],
      "registeredUsersCount": 25
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 10,
    "skip": 0
  }
}
```

---

### GET /contests/:id
Get full contest details.

**Response (200):**
```json
{
  "success": true,
  "contest": {
    "id": "607f1f77bcf86cd799439014",
    "title": "Coding Challenge March 2024",
    "description": "...",
    "status": "upcoming",
    "startTime": "2024-03-15T10:00:00Z",
    "endTime": "2024-03-15T12:00:00Z",
    "creatorId": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "problems": [
      {
        "id": "507f1f77bcf86cd799439012",
        "title": "Two Sum",
        "description": "...",
        "difficulty": "Easy",
        "points": 50
      }
    ],
    "registeredUsers": [
      {
        "id": "507f1f77bcf86cd799439015",
        "username": "alice",
        "email": "alice@example.com"
      }
    ],
    "leaderboard": [
      {
        "userId": "507f1f77bcf86cd799439015",
        "username": "alice",
        "score": 100,
        "totalTime": 450
      }
    ]
  }
}
```

**Errors:**
- 400: Invalid contest ID format
- 404: Contest not found

---

### POST /contests/:id/register
Register for a contest. **User only.**

**Request:** No body

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully registered for the contest."
}
```

**Validations:**
- User must not already be registered
- Contest must not have ended

**Errors:**
- 400: Invalid contest ID, contest has ended
- 401: Not authenticated
- 403: Only regular users can register (not creators)
- 404: Contest not found
- 409: Already registered for this contest

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

**Common HTTP Status Codes:**
- `200`: OK
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate entry)
- `500`: Internal Server Error

---

## Authentication Flow

### For Frontend
1. **Register/Login**: Credentials sent to backend
2. **Cookie Received**: Browser automatically stores `authToken` cookie (httpOnly)
3. **Subsequent Requests**: Include cookie automatically with `withCredentials: true` in axios
4. **Token Verification**: Backend extracts and verifies token from cookie
5. **Logout**: Clear cookie on backend, session ends

### For Testing (cURL)
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{...}' \
  -c cookies.txt

# Login (save cookie)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{...}' \
  -c cookies.txt

# Use saved cookie in requests
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt

# Or extract token from Set-Cookie header and use manually
curl -X GET http://localhost:5000/api/auth/me \
  -H "Cookie: authToken=<jwt_token>"
```

---

## Rate Limiting & Security Notes

- Passwords must be minimum 8 characters
- Passwords are hashed with bcrypt (10 salt rounds)
- Tokens expire after 7 days
- Tokens stored in httpOnly cookies (not accessible via JavaScript)
- CORS allows credentials from `http://localhost:5173` (frontend)
- All inputs are validated on the backend
- SQL injection is prevented by using Mongoose ORM
- XSS attacks are mitigated by httpOnly cookies

---

## Development Tips

**Monitor Server Logs:**
```bash
cd server && npm run dev
# Watch for: "MongoDB connected", "Server listening on port 5000"
```

**Monitor Frontend:**
```bash
cd client && npm run dev
# Server ready on http://localhost:5173
```

**Test with Postman/Thunder Client:**
1. Set `http://localhost:5000/api` as base URL
2. Register an account
3. Copy `authToken` from response cookies or Set-Cookie header
4. Set it in request headers: `Cookie: authToken=<token>`
5. Test protected endpoints

---

## Next Steps for Integration

1. **TestCase Routes**: Add POST/GET endpoints for test case management
2. **Submission System**: Create submission evaluation endpoint
3. **Leaderboard Updates**: Auto-update leaderboard on submission success
4. **User Dashboard**: Show registered contests, scores, rankings
5. **Creator Dashboard**: Manage created problems and contests
6. **Admin Routes**: User management, contest moderation (optional)
