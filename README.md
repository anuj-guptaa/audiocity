Audiobook App
This repository contains the backend services and infrastructure for an audiobook platform. The application supports user authentication, audiobook management, and an e-commerce flow, leveraging AI for transcription and tagging.

Architecture
The system is built on a microservices-like architecture using Docker Compose to orchestrate multiple services. The core components and their roles are outlined below:

backend: A FastAPI application that serves as the main API. It handles all business logic, including user authentication, audiobook CRUD operations for admins, and the user's e-commerce journey (browsing, adding to cart, checkout).

celery_worker: A dedicated Celery worker process that handles long-running, asynchronous tasks. This is crucial for performance, as it offloads the time-consuming AI transcription and tagging process from the main API thread.

db: A PostgreSQL database instance that serves as the primary data store for the application. It holds all information related to users, audiobooks, transactions, and more.

redis: A Redis instance used as both the message broker for Celery and a caching layer for the backend. It's essential for the asynchronous task queue and for improving API response times by caching frequently accessed data.

Key Architectural Decisions
Asynchronous Task Processing with Celery: We use Celery with Redis as the broker to handle AI-driven tasks. This is a critical design choice for a few reasons:

Scalability: It prevents the main API from being blocked by long-running operations. We can scale the number of Celery workers independently based on the volume of audiobook uploads.

Reliability: If a transcription job fails, Celery can be configured to retry the task, ensuring greater reliability.

User Experience: Admins get an immediate response after uploading a file, as the transcription task is handed off to a background worker.

Separation of Concerns: By using a worker for AI tasks and a dedicated backend for API logic, we maintain a clear separation of concerns. This makes the application easier to develop, debug, and scale.

External Cloud Services: The architecture leverages external services for specialized tasks:

Azure Blob Storage: For durable and scalable storage of the large audiobook files.

GPT-4o-transcribe: An AI service for converting audio to text.

GPT-4o-mini: An AI service for generating summaries and relevant tags.

Setup
This project uses Docker for containerization, making it easy to set up and run.

Prerequisites
Docker and Docker Compose installed on your system.

Environment Configuration
Create a .env file in the backend directory.

Add the following variables to the file, replacing the placeholders with your actual credentials:

POSTGRES_DB=your_db_name
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
AZURE_STORAGE_ACCOUNT_NAME=your_azure_storage_account_name
AZURE_STORAGE_KEY=your_azure_storage_key
OPENAI_API_KEY=your_openai_api_key

Running the Application
From the root directory of the project, run the following command to build and start all services:

docker-compose up --build

The backend API will be available at http://localhost:8000.

Backend Features
API Endpoints
Authentication:

POST /api/v1/auth/register: Register a new user with email and password.

POST /api/v1/auth/login: Log in a user.

POST /api/v1/auth/password-reset: Request a password reset.

POST /api/v1/auth/google-login: Google OAuth login.

User Management:

GET /api/v1/users/me: Get the current user's details.

Audiobook Management (Admin Only):

POST /api/v1/audiobooks/upload: Upload an audiobook file. This triggers an asynchronous task for transcription.

GET /api/v1/audiobooks/{id}: View audiobook details.

E-commerce (Users):

GET /api/v1/audiobooks: Browse available audiobooks.

POST /api/v1/cart/add: Add an audiobook to the cart.

GET /api/v1/cart: View cart contents.

POST /api/v1/checkout: Simulate the checkout process.

GET /api/v1/my-books: View and download purchased audiobooks with their transcriptions.

Testing and Reliability
Test Cases
We've implemented unit tests for key backend logic to ensure reliability. Tests cover the following scenarios:

Service Layer:

Successful user registration and login.

Correct password hashing and validation.

Admin role assignment.

Adding an audiobook to the cart and simulating checkout.

Verifying a user can only view books they have purchased.

Controller Layer:

Correct handling of API requests and responses.

Validation of request bodies (e.g., ensuring required fields are present).

Authentication checks to prevent unauthorized access to admin-only endpoints.

Failure Handling
Graceful failure handling is built into the system, particularly for the asynchronous AI transcription process.

Scenario: AI Service Failure

Problem: The GPT-4o-transcribe or GPT-4o-mini service fails to respond or returns an error.

Solution: The Celery task is wrapped in a try...except block. If an error occurs:

The exception is caught and logged to the console, providing details on the failure.

The task is marked as failed, and the audiobook's status in the database is updated to "Transcription Failed."

The task is configured to retry a set number of times with exponential backoff.

If the task fails after all retries, a notification (e.g., an internal alert or email to the admin) is triggered to flag the issue for manual intervention.

This ensures that a single service failure does not crash the entire application and that the system can recover automatically or alert an administrator when needed.

Contributors
[Your Name Here]

Feel free to open an issue or submit a pull request if you have any suggestions or improvements!