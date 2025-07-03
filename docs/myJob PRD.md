# **Project Requirements: AI-Powered Job Search Platform**

**Version:** 1.5 **Date:** July 2, 2024

## **1\. Overview**

This document outlines the requirements for a web-based job search platform that allows users to search for jobs, view summarized descriptions, and save listings to their personal account. The application will leverage external APIs for job data and AI-powered analysis to calculate a matching score between a user's resume and job descriptions. It will also include features for users to upload, manage, and automatically tailor their resumes for specific roles.

## **2\. Target Audience**

The primary users of this platform are active job seekers who want an efficient way to find relevant job opportunities, quickly understand the core requirements through summarized descriptions, see how well they match a position, save interesting listings for future reference, and manage and tailor their resumes for job applications.

## **3\. Functional Requirements**

### **3.1. Job Search and Display**

* **Job Search:** The platform will utilize the **SerpApi** to perform job searches based on user queries (e.g., keywords, location).  
* **Filtering:** After fetching results, the system will perform an AI-driven analysis to calculate a matching score for each job. Only jobs with a matching score of 80 or higher will be displayed to the user.  
* **Data Display:** Search results will be displayed in a clean, responsive table format with the following columns:  
  * **Matching Score:** A **clickable** score from 0-100 indicating the match between the user's default resume and the job description. Clicking the score will display an infographic that visually breaks down the match.  
  * **Title:** The job title.  
  * **Company Name:** The name of the hiring company.  
  * **Location:** The physical location of the job.  
  * **Summary:** An AI-generated summary of the job description (50 words or less).  
  * **Posted At:** The date the job was posted.  
  * **Salary:** The provided salary range or estimate.  
  * **Actions:** A column containing a "Save" icon and a "Tailor Resume" link for each job.

### **3.2. AI-Powered Job Matching**

* **Analysis:** For each job returned by the search API, the system will analyze the full job description against the user's default resume (stored in Firestore).  
* **API Integration:** This analysis will be performed using the **OpenRouter API** with the `openai/gpt-4o-mini` model.  
* **Score Calculation:** The AI model will be prompted to return a numerical matching score between 0 and 100\.  
* **Score Breakdown & Infographic:** The AI model will also be prompted to provide a structured breakdown of the match (e.g., matching keywords, skill alignment, experience relevance). This data will be used to generate an infographic when the user clicks on the matching score, providing a clear, visual explanation of their compatibility with the role.

### **3.3. AI-Powered Summarization**

* **API Integration:** The application will integrate with the **OpenRouter API** to summarize job descriptions for the jobs that meet the matching score threshold.  
* **Model:** The `openai/gpt-4o-mini` model will be used for generating the summaries.  
* **Content:** The summary will be a concise overview of the full job description, limited to 50 words or less, to provide users with a quick snapshot of the role.

### **3.4. AI-Powered Resume Tailoring**

* **Trigger:** This feature is initiated when a user clicks the "Tailor Resume" link next to a job listing in the search results.  
* **Initial Generation:** The system uses the OpenRouter API with the `openai/gpt-4o-mini` model to generate an initial version of the resume tailored to the specific job description, based on the user's default resume.  
* **Interactive Review & Editing:** The user is then taken to a chat-based interface where the tailored resume is presented. The user can provide natural language commands (e.g., "Emphasize my experience with Python," "Make the professional summary shorter") to iteratively edit the resume. The AI will provide updated versions within the chat.  
* **Finalization & Storage:** Once the user is satisfied with the resume, they can choose to save it. The final version will be saved as a new entry in the user's `resumes` collection in Firestore, clearly named after the job title. The user will have the option to save it as a final version or as a 'draft' for further review.

### **3.5. Job Detail View**

* **Navigation:** Users can click on any job title in the search results table to navigate to a dedicated detail page for that specific job.  
* **Content:** The job detail page will display comprehensive information, including:  
  * Full Job Description  
  * Qualifications  
  * Benefits  
  * Responsibilities

### **3.6. User Authentication**

* **Firebase Authentication:** The platform will use Firebase Authentication to manage user accounts.  
* **Sign-up/Sign-in Methods:** Users will be able to create an account and log in using:  
  * Email and Password  
  * Google Account (OAuth)  
* **Session Management:** The system will manage user sessions, keeping users logged in until they explicitly log out.

### **3.7. Resume Management**

* **Resume Upload Page:** A dedicated page will allow authenticated users to upload their resumes.  
* **Storage:** Resumes will be stored in the Firestore database within a `resumes` collection under the user's unique ID.  
* **Default Resume:** The first resume a user uploads will automatically be set as the default. The resume document will have a boolean field named `default`. For the first upload, this will be set to `true`. All subsequent resumes uploaded by that user will have this field set to `false`.  
* **Resume Management Interface:** Users will have a dashboard to manage their uploaded resumes, including tailored ones and drafts.  
* **Delete Functionality:** Users can delete any of their uploaded resumes.  
* **Change Default:** Users can select any of their uploaded resumes and set it as the new default. This action will update the `default` field for the relevant resume documents.  
* **Edit Functionality:** Users will have the ability to edit the content of their uploaded resumes.

### **3.8. Data Storage**

* **Firestore Database:** Saved job listings and user resumes will be stored in a **Firestore** database.  
* **Data Structure:**  
  * **Saved Jobs:** Each user will have a dedicated collection in Firestore to store their saved jobs.  
  * **Resumes:** Each user will have a `resumes` collection to store their uploaded resume data, including the original, all AI-tailored versions, and drafts.

## **4\. Non-Functional Requirements**

* **User Interface (UI):** The UI will be clean, modern, and intuitive, with a focus on ease of use.  
* **Performance:** The application will be optimized for fast load times and responsive interactions.  
* **Responsiveness:** The layout will be fully responsive, providing a seamless experience on desktops, tablets, and mobile devices.  
* **Security:** All user data will be handled securely.

## **5\. Technology Stack**

* **Frontend:** React  
* **Backend/Authentication:** Firebase (Authentication, Firestore).  
* **APIs:**  
  * SerpApi (for job search data)  
  * OpenRouter API (for AI summarization, job matching, and resume tailoring)

