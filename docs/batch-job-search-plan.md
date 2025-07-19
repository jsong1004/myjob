# Batch Job Search Implementation Plan with Cloud Composer

## Overview

This enhanced plan implements a nightly batch job search system using:
- **Google Cloud Composer (Apache Airflow)**: For workflow orchestration and scheduling
- **Apache Beam**: For data processing pipeline
- **Google Dataflow**: For running the pipeline at scale
- **Google Cloud Functions**: For API interactions and lightweight processing
- **Firestore**: For storing results
- **Cloud Storage**: For intermediate data storage

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Cloud Composer  │────▶│ Airflow DAG      │────▶│ Multiple Tasks  │
│  (Scheduler)    │     │ (Orchestrator)   │     │ (Parallel/Serial)│
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                        ┌──────────────────────────────────┼──────────────────────────┐
                        │                                  │                          │
                   ┌────▼─────┐              ┌────────────▼────────┐        ┌────────▼────────┐
                   │User Prefs │              │ Dataflow Pipeline   │        │ Notifications   │
                   │Extraction│              │ (Apache Beam)       │        │ Processing      │
                   └────┬─────┘              └────────┬────────────┘        └────────┬────────┘
                        │                             │                               │
                   ┌────▼─────┐              ┌────────▼────────┐           ┌────────▼────────┐
                   │Firestore │              │ Cloud Functions │           │ SendGrid/Email  │
                   │(Data)    │              │ (API calls)     │           │ Service         │
                   └──────────┘              └─────────────────┘           └─────────────────┘
```

## Implementation Steps

### 1. Set Up Google Cloud Environment

```bash
# Enable required APIs
gcloud services enable composer.googleapis.com
gcloud services enable dataflow.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable storage-component.googleapis.com

# Create Cloud Storage buckets with location specification
gsutil mb -l us-west1 gs://myjob-composer-dags
gsutil mb -l us-west1 gs://myjob-dataflow-staging
gsutil mb -l us-west1 gs://myjob-batch-results
gsutil mb -l us-west1 gs://myjob-airflow-logs

# Create Cloud Composer environment
gcloud composer environments create myjob-batch-processor \
    --location us-west1 \
    --zone us-west1-a \
    --machine-type n1-standard-2 \
    --node-count 3 \
    --disk-size 30 \
    --python-version 3
```

### 2. Create Airflow DAG

Create `composer/dags/batch_job_search_dag.py`:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.operators.dataflow import DataflowTemplatedJobStartOperator
from airflow.providers.google.cloud.operators.functions import CloudFunctionInvokeFunctionOperator
from airflow.providers.google.cloud.operators.firestore import CloudFirestoreGetDocumentOperator
from airflow.providers.google.cloud.hooks.firestore import CloudFirestoreHook
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from airflow.operators.email import EmailOperator
from airflow.utils.task_group import TaskGroup
from airflow.models import Variable
import json
import logging

# Default arguments
default_args = {
    'owner': 'myjob-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 7, 20),
    'email_on_failure': True,
    'email_on_retry': False,
    'email': ['jsong@koreatous.com'],
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

# Create DAG
dag = DAG(
    'batch_job_search',
    default_args=default_args,
    description='Nightly batch job search and scoring pipeline',
    schedule_interval='0 2 * * *',  # Run at 2 AM daily
    catchup=False,
    max_active_runs=1,
    tags=['batch', 'job-search', 'dataflow'],
)

# Configuration
PROJECT_ID = Variable.get('gcp_project_id')
REGION = Variable.get('gcp_region', default_var='us-west1')
DATAFLOW_TEMPLATE = f'gs://{PROJECT_ID}-dataflow-templates/batch-job-search'
TEMP_LOCATION = f'gs://{PROJECT_ID}-dataflow-staging/temp'

def prepare_job_searches(**context):
    """Prepare job search configurations"""
    # Define job titles and locations to search
    job_searches = [
        # Software Engineering
        {"query": "software engineer", "locations": ["Anywhere"]},

        # AI/ML Engineer
        {"query": "ai engineer", "locations": ["Anywhere"]},
        {"query": "ml engineer", "locations": ["Anywhere"]},
        {"query": "mlops engineer", "locations": ["Anywhere"]},
        {"query": "project manager (it)", "locations": ["Anywhere"]},
        
        {"query": "technical lead", "locations": ["Anywhere"]},
        {"query": "business analyst (it)", "locations": ["Anywhere"]},
        # Frontend/Backend
        {"query": "frontend engineer", "locations": ["Anywhere"]},
        {"query": "backend engineer", "locations": ["Anywhere"]},
        {"query": "full stack engineer", "locations": ["Anywhere"]},
        
        # Data/ML
        {"query": "data engineer", "locations": ["Anywhere"]},
        {"query": "machine learning engineer", "locations": ["Anywhere"]},
        {"query": "data scientist", "locations": ["Anywhere"]},
        
        # DevOps/Cloud
        {"query": "devops engineer", "locations": ["Anywhere"]},
        {"query": "cloud engineer", "locations": ["Anywhere"]},
        {"query": "site reliability engineer", "locations": ["Anywhere"]},
        
        # Product/Design
        {"query": "product manager", "locations": ["Anywhere"]},
        {"query": "product designer", "locations": ["Anywhere"]},
        {"query": "ux designer", "locations": ["Anywhere"]},
        
        # Other Tech Roles
        {"query": "technical program manager", "locations": ["Anywhere"]},
        {"query": "engineering manager", "locations": ["Anywhere"]},
        {"query": "solutions architect", "locations": ["Anywhere"]},
    ]
    
    # Create search batches
    all_searches = []
    for job_search in job_searches:
        for location in job_search["locations"]:
            all_searches.append({
                "query": job_search["query"],
                "location": location
            })
    
    # Split into batches for parallel processing
    batch_size = 10  # 10 searches per batch
    search_batches = [all_searches[i:i + batch_size] for i in range(0, len(all_searches), batch_size)]
    
    # Store batches in Cloud Storage
    from google.cloud import storage
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket(f'{PROJECT_ID}-dataflow-staging')
    
    batch_files = []
    run_date = context['ds']
    
    for idx, batch in enumerate(search_batches):
        batch_file = f'search-batches/{run_date}/batch_{idx}.json'
        blob = bucket.blob(batch_file)
        blob.upload_from_string(json.dumps(batch))
        batch_files.append(f'gs://{PROJECT_ID}-dataflow-staging/{batch_file}')
    
    context['task_instance'].xcom_push(key='batch_files', value=batch_files)
    context['task_instance'].xcom_push(key='total_searches', value=len(all_searches))
    
    logging.info(f"Created {len(search_batches)} search batches with {len(all_searches)} total searches")
    return batch_files

def validate_api_keys(**context):
    """Validate that all required API keys are available"""
    required_vars = ['serp_api_key', 'openrouter_api_key', 'sendgrid_api_key']
    
    missing_vars = []
    for var in required_vars:
        try:
            Variable.get(var)
        except KeyError:
            missing_vars.append(var)
    
    if missing_vars:
        raise ValueError(f"Missing required variables: {', '.join(missing_vars)}")
    
    return True

def aggregate_results(**context):
    """Aggregate results from all Dataflow jobs"""
    from google.cloud import storage
    
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket(f'{PROJECT_ID}-batch-results')
    
    run_date = context['ds']
    prefix = f'{run_date}/'
    
    total_jobs = 0
    jobs_by_query = {}
    jobs_by_location = {}
    
    for blob in bucket.list_blobs(prefix=prefix):
        if blob.name.endswith('.json'):
            content = blob.download_as_text()
            for line in content.strip().split('\n'):
                if line:
                    job_data = json.loads(line)
                    total_jobs += 1
                    
                    # Count by query
                    query = job_data.get('searchQuery', 'Unknown')
                    if query not in jobs_by_query:
                        jobs_by_query[query] = 0
                    jobs_by_query[query] += 1
                    
                    # Count by location
                    location = job_data.get('searchLocation', 'Unknown')
                    if location not in jobs_by_location:
                        jobs_by_location[location] = 0
                    jobs_by_location[location] += 1
    
    # Store metrics
    context['task_instance'].xcom_push(key='total_jobs_found', value=total_jobs)
    context['task_instance'].xcom_push(key='jobs_by_query', value=jobs_by_query)
    context['task_instance'].xcom_push(key='jobs_by_location', value=jobs_by_location)
    
    # Log to BigQuery for analytics
    return {
        'run_date': run_date,
        'total_searches': context['task_instance'].xcom_pull(key='total_searches'),
        'total_jobs_found': total_jobs,
        'jobs_by_query': jobs_by_query,
        'jobs_by_location': jobs_by_location,
        'timestamp': datetime.utcnow().isoformat()
    }

def send_admin_summary(**context):
    """Send summary email to administrators"""
    metrics = context['task_instance'].xcom_pull(task_ids='aggregate_results')
    
    subject = f"Batch Job Search Summary - {context['ds']}"
    
    # Sort job counts
    top_queries = sorted(metrics['jobs_by_query'].items(), key=lambda x: x[1], reverse=True)[:10]
    top_locations = sorted(metrics['jobs_by_location'].items(), key=lambda x: x[1], reverse=True)[:10]
    
    html_content = f"""
    <h2>Batch Job Search Summary</h2>
    <p>Date: {context['ds']}</p>
    
    <h3>Overall Metrics:</h3>
    <ul>
        <li>Total Searches Performed: {metrics['total_searches']}</li>
        <li>Total Jobs Found: {metrics['total_jobs_found']}</li>
        <li>Average Jobs per Search: {metrics['total_jobs_found'] / max(metrics['total_searches'], 1):.2f}</li>
    </ul>
    
    <h3>Top 10 Job Titles by Results:</h3>
    <ol>
        {''.join(f'<li>{query}: {count} jobs</li>' for query, count in top_queries)}
    </ol>
    
    <h3>Top 10 Locations by Results:</h3>
    <ol>
        {''.join(f'<li>{location}: {count} jobs</li>' for location, count in top_locations)}
    </ol>
    
    <p>View detailed logs in <a href="https://console.cloud.google.com/composer">Cloud Composer</a></p>
    """
    
    return html_content

# Define tasks
prepare_searches_task = PythonOperator(
    task_id='prepare_job_searches',
    python_callable=prepare_job_searches,
    dag=dag,
)

validate_keys_task = PythonOperator(
    task_id='validate_api_keys',
    python_callable=validate_api_keys,
    dag=dag,
)

# Task group for parallel Dataflow jobs
with TaskGroup('dataflow_processing', dag=dag) as dataflow_group:
    # Dynamic task creation based on user batches
    def create_dataflow_task(batch_index):
        return DataflowTemplatedJobStartOperator(
            task_id=f'run_dataflow_batch_{batch_index}',
            template=DATAFLOW_TEMPLATE,
            job_name=f'batch-job-search-{datetime.now().strftime("%Y%m%d")}-batch-{batch_index}',
            parameters={
                'inputFile': f'{{{{ task_instance.xcom_pull(key="batch_files")[{batch_index}] }}}}',
                'outputBucket': f'gs://{PROJECT_ID}-batch-results',
                'tempLocation': TEMP_LOCATION,
                'serpApiKey': Variable.get('serp_api_key'),
                'openrouterApiKey': Variable.get('openrouter_api_key'),
            },
            dataflow_default_options={
                'project': PROJECT_ID,
                'region': REGION,
                'tempLocation': TEMP_LOCATION,
                'serviceAccountEmail': f'dataflow-sa@{PROJECT_ID}.iam.gserviceaccount.com',
            },
            location=REGION,
            wait_until_finished=True,
            dag=dag,
        )
    
    # Create 10 potential parallel tasks (actual number depends on user count)
    dataflow_tasks = [create_dataflow_task(i) for i in range(10)]

# Aggregate results
aggregate_task = PythonOperator(
    task_id='aggregate_results',
    python_callable=aggregate_results,
    dag=dag,
)

# Log metrics to BigQuery
log_metrics_task = BigQueryInsertJobOperator(
    task_id='log_metrics_to_bigquery',
    configuration={
        "load": {
            "sourceFormat": "NEWLINE_DELIMITED_JSON",
            "sourceUris": [f"gs://{PROJECT_ID}-batch-results/metrics/{{{{ ds }}}}.json"],
            "destinationTable": {
                "projectId": PROJECT_ID,
                "datasetId": "myjob_analytics",
                "tableId": "batch_job_metrics"
            },
            "writeDisposition": "WRITE_APPEND",
            "autodetect": True,
        }
    },
    dag=dag,
)

# Send notifications
send_user_notifications_task = CloudFunctionInvokeFunctionOperator(
    task_id='send_user_notifications',
    function_id='sendJobNotifications',
    input_data={'date': '{{ ds }}', 'dryRun': False},
    location=REGION,
    project_id=PROJECT_ID,
    dag=dag,
)

# Send admin summary
admin_summary_task = EmailOperator(
    task_id='send_admin_summary',
    to=['admin@myjob.ai'],
    subject='Batch Job Search Summary - {{ ds }}',
    html_content="{{ task_instance.xcom_pull(task_ids='send_admin_summary') }}",
    dag=dag,
)

# Define task dependencies
validate_keys_task >> prepare_searches_task >> dataflow_group
dataflow_group >> aggregate_task >> log_metrics_task
aggregate_task >> admin_summary_task
```

### 3. Enhanced Dataflow Pipeline with Airflow Integration

Create `dataflow-pipeline/job_search_pipeline_v2.py`:

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions
from apache_beam.io.gcp.firestore import ReadFromFirestore, WriteToFirestore
from apache_beam.io import ReadFromText, WriteToText
from apache_beam.metrics import Metrics
import requests
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
import hashlib

class MetricsCollector:
    """Collect metrics for Airflow monitoring"""
    
    def __init__(self):
        self.jobs_processed = Metrics.counter('pipeline', 'jobs_processed')
        self.jobs_scored = Metrics.counter('pipeline', 'jobs_scored')
        self.high_score_matches = Metrics.counter('pipeline', 'high_score_matches')
        self.api_errors = Metrics.counter('pipeline', 'api_errors')
        self.processing_time = Metrics.distribution('pipeline', 'processing_time_seconds')

metrics = MetricsCollector()

class ReadSearchBatchDoFn(beam.DoFn):
    """Read search batch from JSON file"""
    
    def process(self, file_path):
        import json
        
        with beam.io.filesystems.open(file_path) as f:
            searches = json.load(f)
            
        for search in searches:
            yield {
                'query': search['query'],
                'location': search['location'],
                'searchId': hashlib.md5(
                    f"{search['query']}-{search['location']}".encode()
                ).hexdigest()
            }

class SearchJobsWithRetryDoFn(beam.DoFn):
    """Search jobs with retry logic and circuit breaker"""
    
    def __init__(self, search_function_url, serp_api_key, max_retries=3):
        self.search_function_url = search_function_url
        self.serp_api_key = serp_api_key
        self.max_retries = max_retries
        self._circuit_breaker_failures = 0
        self._circuit_breaker_threshold = 5
        self._circuit_breaker_open = False
    
    def process(self, search_config):
        import time
        
        # Check circuit breaker
        if self._circuit_breaker_open:
            if self._circuit_breaker_failures < self._circuit_breaker_threshold * 2:
                logging.warning("Circuit breaker is open, skipping search")
                return
            else:
                # Try to reset circuit breaker
                self._circuit_breaker_open = False
                self._circuit_breaker_failures = 0
        
        start_time = time.time()
        
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    self.search_function_url,
                    json={
                        'query': search_config['query'],
                        'location': search_config['location'],
                        'apiKey': self.serp_api_key,
                        'page': 1,
                        'num_pages': 10  # Get up to 10 pages of results
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    jobs = response.json().get('jobs', [])
                    
                    # Reset circuit breaker on success
                    self._circuit_breaker_failures = 0
                    
                    # Add metrics
                    metrics.jobs_processed.inc(len(jobs))
                    
                    # Add search context and dedupe ID
                    for job in jobs:
                        job['searchQuery'] = search_config['query']
                        job['searchLocation'] = search_config['location']
                        job['uniqueId'] = hashlib.md5(
                            f"{job['id']}-{search_config['searchId']}".encode()
                        ).hexdigest()
                        job['searchTimestamp'] = datetime.utcnow().isoformat()
                        job['batchJobId'] = search_config['searchId']
                    
                    # Record processing time
                    processing_time = time.time() - start_time
                    metrics.processing_time.update(processing_time)
                    
                    yield from jobs
                    break
                    
                else:
                    logging.error(f"Search API returned status {response.status_code}")
                    if attempt < self.max_retries - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
                    
            except Exception as e:
                logging.error(f"Error searching jobs (attempt {attempt + 1}): {str(e)}")
                metrics.api_errors.inc()
                
                self._circuit_breaker_failures += 1
                if self._circuit_breaker_failures >= self._circuit_breaker_threshold:
                    self._circuit_breaker_open = True
                    logging.error("Circuit breaker opened due to repeated failures")
                
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)

class BatchFetchResumesDoFn(beam.DoFn):
    """Batch fetch resumes from Firestore for efficiency"""
    
    def __init__(self, project_id, batch_size=50):
        self.project_id = project_id
        self.batch_size = batch_size
        self._firestore_client = None
        self._resume_cache = {}
    
    @property
    def firestore_client(self):
        if self._firestore_client is None:
            from google.cloud import firestore
            self._firestore_client = firestore.Client(project=self.project_id)
        return self._firestore_client
    
    def start_bundle(self):
        self._job_buffer = []
    
    def process(self, job):
        self._job_buffer.append(job)
        
        if len(self._job_buffer) >= self.batch_size:
            yield from self._fetch_and_process_batch()
    
    def finish_bundle(self):
        if self._job_buffer:
            yield from self._fetch_and_process_batch()
    
    def _fetch_and_process_batch(self):
        # Get unique resume IDs
        resume_ids = list(set(
            job.get('resumeId') for job in self._job_buffer 
            if job.get('resumeId') and job.get('resumeId') not in self._resume_cache
        ))
        
        # Batch fetch resumes
        if resume_ids:
            for resume_id in resume_ids:
                try:
                    resume_doc = self.firestore_client.collection('resumes').document(resume_id).get()
                    if resume_doc.exists:
                        self._resume_cache[resume_id] = resume_doc.to_dict().get('content', '')
                except Exception as e:
                    logging.error(f"Error fetching resume {resume_id}: {str(e)}")
                    self._resume_cache[resume_id] = ''
        
        # Process buffered jobs
        for job in self._job_buffer:
            resume_id = job.get('resumeId')
            
            if resume_id and resume_id in self._resume_cache:
                job['resume'] = self._resume_cache[resume_id]
            else:
                # Try to get any resume for the user
                try:
                    resumes = self.firestore_client.collection('resumes')\
                        .where('userId', '==', job['userId'])\
                        .limit(1).get()
                    
                    if resumes:
                        job['resume'] = resumes[0].to_dict().get('content', '')
                    else:
                        job['resume'] = ''
                except Exception:
                    job['resume'] = ''
            
            yield job
        
        self._job_buffer = []

class ScoreJobMatchWithCacheDoFn(beam.DoFn):
    """Score job matches with caching and batching"""
    
    def __init__(self, score_function_url, openrouter_api_key):
        self.score_function_url = score_function_url
        self.openrouter_api_key = openrouter_api_key
        self._score_cache = {}
    
    def process(self, job_with_resume):
        # Create cache key
        cache_key = hashlib.md5(
            f"{job_with_resume['title']}-{job_with_resume['company']}-{len(job_with_resume.get('resume', ''))}".encode()
        ).hexdigest()
        
        # Check cache
        if cache_key in self._score_cache:
            cached_score = self._score_cache[cache_key]
            job_with_resume['matchingScore'] = cached_score['score']
            job_with_resume['matchingSummary'] = cached_score['summary']
            job_with_resume['scoreCached'] = True
        else:
            try:
                # Skip if no resume
                if not job_with_resume.get('resume'):
                    job_with_resume['matchingScore'] = 0
                    job_with_resume['matchingSummary'] = 'No resume available'
                else:
                    response = requests.post(
                        self.score_function_url,
                        json={
                            'job': {
                                'title': job_with_resume['title'],
                                'company': job_with_resume['company'],
                                'description': job_with_resume.get('description', ''),
                                'qualifications': job_with_resume.get('qualifications', []),
                                'responsibilities': job_with_resume.get('responsibilities', [])
                            },
                            'resume': job_with_resume['resume'],
                            'apiKey': self.openrouter_api_key,
                            'useEnhancedScoring': True  # Use multi-agent scoring
                        },
                        timeout=45
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        job_with_resume['matchingScore'] = result['matchingScore']
                        job_with_resume['matchingSummary'] = result['matchingSummary']
                        job_with_resume['enhancedAnalysis'] = result.get('enhancedAnalysis', {})
                        
                        # Cache the result
                        self._score_cache[cache_key] = {
                            'score': result['matchingScore'],
                            'summary': result['matchingSummary']
                        }
                        
                        metrics.jobs_scored.inc()
                        if result['matchingScore'] >= 80:
                            metrics.high_score_matches.inc()
                    else:
                        job_with_resume['matchingScore'] = 0
                        job_with_resume['matchingSummary'] = 'Scoring failed'
                        
            except Exception as e:
                logging.error(f"Error scoring job: {str(e)}")
                job_with_resume['matchingScore'] = 0
                job_with_resume['matchingSummary'] = f'Error: {str(e)}'
                metrics.api_errors.inc()
        
        # Remove resume from output
        job_with_resume.pop('resume', None)
        
        # Add processing metadata
        job_with_resume['processedAt'] = datetime.utcnow().isoformat()
        job_with_resume['pipelineVersion'] = '2.0'
        
        yield job_with_resume

class PrepareForStorageDoFn(beam.DoFn):
    """Prepare data for various storage destinations"""
    
    def process(self, job):
        # Prepare for Firestore - no userId since it's a general batch job
        firestore_doc = {
            'jobId': job['id'],
            'title': job['title'],
            'company': job['company'],
            'location': job['location'],
            'description': job.get('description', '')[:2000],  # Truncate for storage
            'qualifications': job.get('qualifications', [])[:10],  # Limit array size
            'responsibilities': job.get('responsibilities', [])[:10],
            'benefits': job.get('benefits', [])[:10],
            'salary': job.get('salary', ''),
            'postedAt': job.get('postedAt', ''),
            'applyUrl': job.get('applyUrl', ''),
            'source': job.get('source', 'batch'),
            'searchQuery': job['searchQuery'],
            'searchLocation': job['searchLocation'],
            'batchJobId': job['batchJobId'],
            'createdAt': datetime.utcnow(),
            'processedAt': job.get('searchTimestamp'),
            'companyLogo': job.get('companyLogo', ''),
            'thumbnail': job.get('thumbnail', ''),
            'highlights': job.get('highlights', {}),
            'extensions': job.get('extensions', [])
        }
        
        yield beam.pvalue.TaggedOutput('firestore', firestore_doc)
        
        # Always output to GCS for analytics
        yield beam.pvalue.TaggedOutput('gcs', job)
        
        # Output metrics data
        metrics_data = {
            'jobId': job['id'],
            'searchQuery': job['searchQuery'],
            'searchLocation': job['searchLocation'],
            'timestamp': job['searchTimestamp']
        }
        yield beam.pvalue.TaggedOutput('metrics', metrics_data)

def run_pipeline(
    project_id, 
    region, 
    input_file,
    output_bucket,
    temp_location, 
    serp_api_key, 
    openrouter_api_key
):
    """Run the enhanced batch job search pipeline"""
    
    # Pipeline options
    options = PipelineOptions(
        project=project_id,
        region=region,
        temp_location=temp_location,
        runner='DataflowRunner',
        job_name=f'batch-job-search-v2-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
        setup_file='./setup.py',
        experiments=['use_runner_v2'],
        max_num_workers=10,
        autoscaling_algorithm='THROUGHPUT_BASED',
        save_main_session=True
    )
    
    # Cloud Function URLs
    search_function_url = f'https://{region}-{project_id}.cloudfunctions.net/searchJobs'
    score_function_url = f'https://{region}-{project_id}.cloudfunctions.net/scoreJobMatch'
    
    with beam.Pipeline(options=options) as pipeline:
        # Read user batch
        user_queries = (
            pipeline
            | 'Read Input File' >> beam.Create([input_file])
            | 'Parse User Batch' >> beam.ParDo(ReadUserBatchDoFn())
        )
        
        # Process jobs
        processed_jobs = (
            user_queries
            | 'Search Jobs' >> beam.ParDo(
                SearchJobsWithRetryDoFn(search_function_url, serp_api_key)
            )
            | 'Remove Duplicates' >> beam.Distinct(lambda j: j['uniqueId'])
            | 'Batch Fetch Resumes' >> beam.ParDo(
                BatchFetchResumesDoFn(project_id)
            )
            | 'Score Matches' >> beam.ParDo(
                ScoreJobMatchWithCacheDoFn(score_function_url, openrouter_api_key)
            )
            | 'Prepare Storage' >> beam.ParDo(PrepareForStorageDoFn()).with_outputs(
                'firestore', 'gcs', 'metrics'
            )
        )
        
        # Write to Firestore (high-scoring jobs only)
        (
            processed_jobs.firestore
            | 'Write to Firestore' >> WriteToFirestore(
                project=project_id,
                collection='batch-jobs'
            )
        )
        
        # Write all jobs to GCS
        (
            processed_jobs.gcs
            | 'Convert to JSON' >> beam.Map(json.dumps)
            | 'Write to GCS' >> WriteToText(
                f'{output_bucket}/{datetime.now().strftime("%Y%m%d")}/jobs',
                file_name_suffix='.json',
                shard_name_template='-SS-of-NN'
            )
        )
        
        # Write metrics
        (
            processed_jobs.metrics
            | 'Convert Metrics to JSON' >> beam.Map(json.dumps)
            | 'Write Metrics' >> WriteToText(
                f'{output_bucket}/metrics/{datetime.now().strftime("%Y%m%d")}/metrics',
                file_name_suffix='.json'
            )
        )

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--project_id', required=True)
    parser.add_argument('--region', default='us-central1')
    parser.add_argument('--input_file', required=True)
    parser.add_argument('--output_bucket', required=True)
    parser.add_argument('--temp_location', required=True)
    parser.add_argument('--serp_api_key', required=True)
    parser.add_argument('--openrouter_api_key', required=True)
    
    args = parser.parse_args()
    
    run_pipeline(
        args.project_id,
        args.region,
        args.input_file,
        args.output_bucket,
        args.temp_location,
        args.serp_api_key,
        args.openrouter_api_key
    )
```

### 4. Enhanced Cloud Functions with Monitoring

Create `cloud-functions/job-search-api-v2/index.js`:

```javascript
const functions = require('@google-cloud/functions-framework');
const axios = require('axios');
const { Logging } = require('@google-cloud/logging');
const { CloudTasksClient } = require('@google-cloud/tasks');

// Initialize clients
const logging = new Logging();
const log = logging.log('job-search-functions');
const tasksClient = new CloudTasksClient();

/**
 * Enhanced job search with pagination and monitoring
 */
functions.http('searchJobs', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, location, apiKey, page = 1, num_pages = 1 } = req.body;
    
    if (!query || !location || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Log the search request
    await log.write(log.entry({
      severity: 'INFO',
      resource: { type: 'cloud_function', labels: { function_name: 'searchJobs' } },
      jsonPayload: {
        event: 'search_request',
        query,
        location,
        page,
        num_pages
      }
    }));

    let allJobs = [];
    let currentPage = page;
    let hasMorePages = true;

    // Fetch multiple pages
    while (hasMorePages && currentPage < page + num_pages) {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          location: location,
          engine: 'google_jobs',
          api_key: apiKey,
          start: (currentPage - 1) * 10,
          num: 10,
        },
        timeout: 20000
      });

      const jobs = response.data.jobs_results || [];
      
      if (jobs.length === 0) {
        hasMorePages = false;
      } else {
        // Enhanced job formatting
        const formattedJobs = jobs.map(job => ({
          id: job.job_id || `${job.title}-${job.company_name}-${Date.now()}-${Math.random()}`,
          title: job.title,
          company: job.company_name,
          location: job.location,
          description: job.description || '',
          qualifications: extractQualifications(job),
          responsibilities: extractResponsibilities(job),
          benefits: job.highlights?.benefits || [],
          salary: job.salary || '',
          postedAt: job.posted_at || '',
          applyUrl: job.link || '',
          source: 'google_jobs',
          extensions: job.extensions || [],
          highlights: job.highlights || {},
          thumbnail: job.thumbnail,
          companyLogo: job.company_logo,
        }));

        allJobs = allJobs.concat(formattedJobs);
        currentPage++;
      }

      // Add delay to avoid rate limiting
      if (hasMorePages && currentPage < page + num_pages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Remove duplicates
    const uniqueJobs = Array.from(
      new Map(allJobs.map(job => [job.id, job])).values()
    );

    // Log success metrics
    const duration = Date.now() - startTime;
    await log.write(log.entry({
      severity: 'INFO',
      resource: { type: 'cloud_function', labels: { function_name: 'searchJobs' } },
      jsonPayload: {
        event: 'search_success',
        query,
        location,
        jobs_found: uniqueJobs.length,
        pages_fetched: currentPage - page,
        duration_ms: duration
      }
    }));

    res.status(200).json({ 
      jobs: uniqueJobs,
      metadata: {
        query,
        location,
        total_found: uniqueJobs.length,
        pages_fetched: currentPage - page
      }
    });

  } catch (error) {
    // Log error
    await log.write(log.entry({
      severity: 'ERROR',
      resource: { type: 'cloud_function', labels: { function_name: 'searchJobs' } },
      jsonPayload: {
        event: 'search_error',
        error: error.message,
        stack: error.stack,
        duration_ms: Date.now() - startTime
      }
    }));

    console.error('Error searching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enhanced scoring with multi-agent support
 */
functions.http('scoreJobMatch', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { job, resume, apiKey, useEnhancedScoring = false } = req.body;
    
    if (!job || !resume || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    let prompt;
    
    if (useEnhancedScoring) {
      // Multi-agent scoring prompt
      prompt = `
        As an expert recruiter, analyze this job match using multiple perspectives:

        Resume:
        ${resume}

        Job Details:
        Title: ${job.title}
        Company: ${job.company}
        Description: ${job.description}
        Qualifications: ${JSON.stringify(job.qualifications)}
        Responsibilities: ${JSON.stringify(job.responsibilities)}

        Provide a comprehensive analysis with:
        1. Overall match score (0-100)
        2. Technical skills alignment
        3. Experience relevance
        4. Key strengths for this role
        5. Potential gaps or concerns
        6. Hiring recommendation

        Response format:
        {
          "score": <number>,
          "summary": "<brief summary>",
          "enhancedAnalysis": {
            "technicalAlignment": "<analysis>",
            "experienceRelevance": "<analysis>",
            "keyStrengths": ["<strength1>", "<strength2>"],
            "gaps": ["<gap1>", "<gap2>"],
            "recommendation": "<hiring recommendation>"
          }
        }
      `;
    } else {
      // Simple scoring prompt
      prompt = `
        Analyze the job match between this resume and job description.
        
        Resume:
        ${resume}
        
        Job Description:
        Title: ${job.title}
        Company: ${job.company}
        ${job.description}
        
        Provide a matching score from 0-100 and a brief summary.
        Response format: {"score": <number>, "summary": "<string>"}
      `;
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: useEnhancedScoring ? 1000 : 500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'MyJob Batch Scoring'
        },
        timeout: 30000
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    
    // Validate score
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      result.score = 0;
      result.summary = 'Invalid scoring result';
    }

    // Log scoring metrics
    await log.write(log.entry({
      severity: 'INFO',
      resource: { type: 'cloud_function', labels: { function_name: 'scoreJobMatch' } },
      jsonPayload: {
        event: 'scoring_success',
        job_title: job.title,
        company: job.company,
        score: result.score,
        enhanced: useEnhancedScoring,
        duration_ms: Date.now() - startTime
      }
    }));

    res.status(200).json({
      matchingScore: result.score,
      matchingSummary: result.summary,
      enhancedAnalysis: result.enhancedAnalysis || null
    });

  } catch (error) {
    // Log error
    await log.write(log.entry({
      severity: 'ERROR',
      resource: { type: 'cloud_function', labels: { function_name: 'scoreJobMatch' } },
      jsonPayload: {
        event: 'scoring_error',
        error: error.message,
        duration_ms: Date.now() - startTime
      }
    }));

    console.error('Error scoring job:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send batch job notifications with queuing
 */
functions.http('sendJobNotifications', async (req, res) => {
  const { Firestore } = require('@google-cloud/firestore');
  const sgMail = require('@sendgrid/mail');
  
  const firestore = new Firestore();
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  try {
    const { date, dryRun = false } = req.body;
    
    // Get new batch jobs
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const batchJobs = await firestore
      .collection('batch-jobs')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .where('notificationSent', '==', false)
      .where('matchingScore', '>=', 85)
      .get();
    
    // Group by user
    const jobsByUser = {};
    batchJobs.forEach(doc => {
      const job = { id: doc.id, ...doc.data() };
      const userId = job.userId;
      
      if (!jobsByUser[userId]) {
        jobsByUser[userId] = {
          email: job.userEmail,
          jobs: []
        };
      }
      jobsByUser[userId].jobs.push(job);
    });
    
    # Queue notifications
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.FUNCTION_REGION || 'us-west1';
    const queue = 'email-notifications';
    const parent = tasksClient.queuePath(project, location, queue);
    
    const notifications = [];
    
    for (const [userId, userData] of Object.entries(jobsByUser)) {
      if (!userData.email) continue;
      
      // Create task for each user
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: `https://${location}-${project}.cloudfunctions.net/sendUserNotificationEmail`,
          body: Buffer.from(JSON.stringify({
            userId,
            email: userData.email,
            jobs: userData.jobs,
            date
          })).toString('base64'),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };
      
      if (!dryRun) {
        const [response] = await tasksClient.createTask({ parent, task });
        notifications.push({
          userId,
          email: userData.email,
          jobCount: userData.jobs.length,
          taskName: response.name
        });
      } else {
        notifications.push({
          userId,
          email: userData.email,
          jobCount: userData.jobs.length,
          dryRun: true
        });
      }
    }
    
    // Log notification summary
    await log.write(log.entry({
      severity: 'INFO',
      resource: { type: 'cloud_function', labels: { function_name: 'sendJobNotifications' } },
      jsonPayload: {
        event: 'notifications_queued',
        date,
        total_users: notifications.length,
        total_jobs: Object.values(jobsByUser).reduce((sum, u) => sum + u.jobs.length, 0),
        dry_run: dryRun
      }
    }));
    
    res.status(200).json({
      success: true,
      notifications: notifications.length,
      details: notifications
    });
    
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function extractQualifications(job) {
  const qualifications = [];
  
  if (job.highlights?.qualifications) {
    qualifications.push(...job.highlights.qualifications);
  }
  
  // Extract from description using common patterns
  if (job.description) {
    const qualPattern = /(?:requirements?|qualifications?):?\s*((?:[-•]\s*[^\n]+\n?)+)/i;
    const match = job.description.match(qualPattern);
    if (match) {
      const items = match[1].split(/[-•]\s*/).filter(item => item.trim());
      qualifications.push(...items.map(item => item.trim()));
    }
  }
  
  return [...new Set(qualifications)]; // Remove duplicates
}

function extractResponsibilities(job) {
  const responsibilities = [];
  
  if (job.highlights?.responsibilities) {
    responsibilities.push(...job.highlights.responsibilities);
  }
  
  // Extract from description
  if (job.description) {
    const respPattern = /(?:responsibilities|duties|you will):?\s*((?:[-•]\s*[^\n]+\n?)+)/i;
    const match = job.description.match(respPattern);
    if (match) {
      const items = match[1].split(/[-•]\s*/).filter(item => item.trim());
      responsibilities.push(...items.map(item => item.trim()));
    }
  }
  
  return [...new Set(responsibilities)];
}
```

### 5. Monitoring Dashboard and Alerts

Create `monitoring/composer_monitoring.py`:

```python
from google.cloud import monitoring_v3
from google.cloud import logging
import datetime

class ComposerMonitor:
    """Monitor Airflow DAGs and pipeline health"""
    
    def __init__(self, project_id):
        self.project_id = project_id
        self.monitoring_client = monitoring_v3.MetricServiceClient()
        self.alert_client = monitoring_v3.AlertPolicyServiceClient()
        self.project_name = f"projects/{project_id}"
    
    def create_alerts(self):
        """Create monitoring alerts for the pipeline"""
        
        # Alert for DAG failures
        dag_failure_alert = monitoring_v3.AlertPolicy(
            display_name="Batch Job Search DAG Failure",
            conditions=[
                monitoring_v3.AlertPolicy.Condition(
                    display_name="DAG execution failed",
                    condition_threshold=monitoring_v3.AlertPolicy.Condition.MetricThreshold(
                        filter='resource.type="cloud_composer_environment" '
                               'AND metric.type="composer.googleapis.com/environment/dag/failed_runs"',
                        comparison=monitoring_v3.ComparisonType.COMPARISON_GT,
                        threshold_value=0,
                        duration={"seconds": 60},
                        aggregations=[
                            monitoring_v3.Aggregation(
                                alignment_period={"seconds": 60},
                                per_series_aligner=monitoring_v3.Aggregation.Aligner.ALIGN_COUNT_TRUE,
                            )
                        ],
                    ),
                )
            ],
            notification_channels=[],  # Add your notification channel IDs
            alert_strategy=monitoring_v3.AlertPolicy.AlertStrategy(
                notification_rate_limit=monitoring_v3.AlertPolicy.AlertStrategy.NotificationRateLimit(
                    period={"seconds": 3600}  # Max 1 notification per hour
                )
            ),
        )
        
        # Alert for high API error rate
        api_error_alert = monitoring_v3.AlertPolicy(
            display_name="High API Error Rate",
            conditions=[
                monitoring_v3.AlertPolicy.Condition(
                    display_name="API errors exceed threshold",
                    condition_threshold=monitoring_v3.AlertPolicy.Condition.MetricThreshold(
                        filter='resource.type="cloud_function" '
                               'AND metric.type="cloudfunctions.googleapis.com/function/error_count"',
                        comparison=monitoring_v3.ComparisonType.COMPARISON_GT,
                        threshold_value=10,
                        duration={"seconds": 300},
                        aggregations=[
                            monitoring_v3.Aggregation(
                                alignment_period={"seconds": 300},
                                per_series_aligner=monitoring_v3.Aggregation.Aligner.ALIGN_RATE,
                            )
                        ],
                    ),
                )
            ],
            notification_channels=[],
        )
        
        # Alert for low match rate
        low_match_alert = monitoring_v3.AlertPolicy(
            display_name="Low Job Match Rate",
            conditions=[
                monitoring_v3.AlertPolicy.Condition(
                    display_name="Match rate below 10%",
                    condition_threshold=monitoring_v3.AlertPolicy.Condition.MetricThreshold(
                        filter='resource.type="dataflow_job" '
                               'AND metric.type="dataflow.googleapis.com/job/user_counter" '
                               'AND metric.label.metric_name="high_score_matches"',
                        comparison=monitoring_v3.ComparisonType.COMPARISON_LT,
                        threshold_value=0.1,
                        duration={"seconds": 1800},
                    ),
                )
            ],
            notification_channels=[],
        )
        
        # Create the alerts
        for alert in [dag_failure_alert, api_error_alert, low_match_alert]:
            self.alert_client.create_alert_policy(
                name=self.project_name,
                alert_policy=alert
            )
    
    def create_dashboard(self):
        """Create a comprehensive monitoring dashboard"""
        
        from google.cloud import monitoring_dashboard_v1
        
        dashboard_client = monitoring_dashboard_v1.DashboardsServiceClient()
        
        dashboard = monitoring_dashboard_v1.Dashboard(
            display_name="MyJob Batch Processing - Composer",
            mosaicLayout=monitoring_dashboard_v1.MosaicLayout(
                columns=12,
                tiles=[
                    # DAG Success Rate
                    monitoring_dashboard_v1.MosaicLayout.Tile(
                        width=6,
                        height=4,
                        widget=monitoring_dashboard_v1.Widget(
                            title="DAG Success Rate",
                            scorecard=monitoring_dashboard_v1.Scorecard(
                                timeSeriesQuery=monitoring_dashboard_v1.TimeSeriesQuery(
                                    timeSeriesFilter=monitoring_dashboard_v1.TimeSeriesFilter(
                                        filter='resource.type="cloud_composer_environment" '
                                               'AND metric.type="composer.googleapis.com/environment/dag/success_ratio"',
                                    )
                                ),
                                thresholds=[
                                    monitoring_dashboard_v1.Threshold(value=0.95, direction="BELOW", color="RED"),
                                    monitoring_dashboard_v1.Threshold(value=0.99, direction="BELOW", color="YELLOW"),
                                ],
                            ),
                        ),
                    ),
                    # Task Duration
                    monitoring_dashboard_v1.MosaicLayout.Tile(
                        x_pos=6,
                        width=6,
                        height=4,
                        widget=monitoring_dashboard_v1.Widget(
                            title="Average Task Duration",
                            xyChart=monitoring_dashboard_v1.XyChart(
                                timeSeries=[
                                    monitoring_dashboard_v1.XyChart.TimeSeries(
                                        timeSeriesQuery=monitoring_dashboard_v1.TimeSeriesQuery(
                                            timeSeriesFilter=monitoring_dashboard_v1.TimeSeriesFilter(
                                                filter='resource.type="cloud_composer_environment" '
                                                       'AND metric.type="composer.googleapis.com/environment/task/duration"',
                                            )
                                        ),
                                    )
                                ],
                            ),
                        ),
                    ),
                    # Dataflow Job Status
                    monitoring_dashboard_v1.MosaicLayout.Tile(
                        y_pos=4,
                        width=12,
                        height=4,
                        widget=monitoring_dashboard_v1.Widget(
                            title="Dataflow Jobs",
                            xyChart=monitoring_dashboard_v1.XyChart(
                                timeSeries=[
                                    monitoring_dashboard_v1.XyChart.TimeSeries(
                                        timeSeriesQuery=monitoring_dashboard_v1.TimeSeriesQuery(
                                            timeSeriesFilter=monitoring_dashboard_v1.TimeSeriesFilter(
                                                filter='resource.type="dataflow_job" '
                                                       'AND metric.type="dataflow.googleapis.com/job/current_num_vcpus"',
                                            )
                                        ),
                                        legendTemplate="vCPUs: ${metric.labels.job_name}",
                                    )
                                ],
                            ),
                        ),
                    ),
                    # Job Metrics
                    monitoring_dashboard_v1.MosaicLayout.Tile(
                        y_pos=8,
                        width=6,
                        height=4,
                        widget=monitoring_dashboard_v1.Widget(
                            title="Jobs Processed",
                            xyChart=monitoring_dashboard_v1.XyChart(
                                timeSeries=[
                                    monitoring_dashboard_v1.XyChart.TimeSeries(
                                        timeSeriesQuery=monitoring_dashboard_v1.TimeSeriesQuery(
                                            timeSeriesFilter=monitoring_dashboard_v1.TimeSeriesFilter(
                                                filter='resource.type="dataflow_job" '
                                                       'AND metric.type="dataflow.googleapis.com/job/user_counter" '
                                                       'AND metric.label.metric_name="jobs_processed"',
                                            )
                                        ),
                                    )
                                ],
                            ),
                        ),
                    ),
                    # Match Rate
                    monitoring_dashboard_v1.MosaicLayout.Tile(
                        x_pos=6,
                        y_pos=8,
                        width=6,
                        height=4,
                        widget=monitoring_dashboard_v1.Widget(
                            title="High Score Match Rate",
                            scorecard=monitoring_dashboard_v1.Scorecard(
                                timeSeriesQuery=monitoring_dashboard_v1.TimeSeriesQuery(
                                    timeSeriesFilter=monitoring_dashboard_v1.TimeSeriesFilter(
                                        filter='resource.type="dataflow_job" '
                                               'AND metric.type="dataflow.googleapis.com/job/user_counter" '
                                               'AND metric.label.metric_name="high_score_matches"',
                                    ),
                                    timeSeriesFilterRatio=monitoring_dashboard_v1.TimeSeriesFilterRatio(
                                        numerator=monitoring_dashboard_v1.TimeSeriesFilter(
                                            filter='metric.label.metric_name="high_score_matches"'
                                        ),
                                        denominator=monitoring_dashboard_v1.TimeSeriesFilter(
                                            filter='metric.label.metric_name="jobs_scored"'
                                        ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ],
            ),
        )
        
        dashboard_client.create_dashboard(
            parent=self.project_name,
            dashboard=dashboard
        )

if __name__ == "__main__":
    monitor = ComposerMonitor("your-project-id")
    monitor.create_alerts()
    monitor.create_dashboard()
```

### 6. Data Quality and Validation

Create `composer/dags/data_quality_dag.py`:

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryCheckOperator,
    BigQueryValueCheckOperator,
    BigQueryIntervalCheckOperator
)
from datetime import datetime, timedelta

default_args = {
    'owner': 'myjob-team',
    'depends_on_past': True,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email': ['admin@myjob.ai'],
    'retries': 1,
}

dag = DAG(
    'batch_job_data_quality',
    default_args=default_args,
    description='Data quality checks for batch job processing',
    schedule_interval='0 9 * * *',  # Run at 9 AM after batch processing
    catchup=False,
)

# Check that batch jobs were created
check_jobs_created = BigQueryValueCheckOperator(
    task_id='check_jobs_created',
    sql="""
    SELECT COUNT(*) as job_count
    FROM `{{ var.value.gcp_project_id }}.myjob_analytics.batch_jobs`
    WHERE DATE(created_at) = CURRENT_DATE()
    """,
    pass_value=10,  # At least 10 jobs should be created
    use_legacy_sql=False,
    dag=dag,
)

# Check match score distribution
check_score_distribution = BigQueryCheckOperator(
    task_id='check_score_distribution',
    sql="""
    SELECT 
        AVG(matching_score) as avg_score,
        MIN(matching_score) as min_score,
        MAX(matching_score) as max_score
    FROM `{{ var.value.gcp_project_id }}.myjob_analytics.batch_jobs`
    WHERE DATE(created_at) = CURRENT_DATE()
    HAVING avg_score BETWEEN 20 AND 90
        AND min_score >= 0
        AND max_score <= 100
    """,
    use_legacy_sql=False,
    dag=dag,
)

# Check for data anomalies compared to previous days
check_volume_anomaly = BigQueryIntervalCheckOperator(
    task_id='check_volume_anomaly',
    table='{{ var.value.gcp_project_id }}.myjob_analytics.batch_job_metrics',
    days_back=7,
    date_filter_column='timestamp',
    metrics_thresholds={
        'COUNT(*)': 1.5,  # No more than 50% change
        'AVG(matching_score)': 1.2,  # No more than 20% change
    },
    dag=dag,
)

def validate_user_preferences(**context):
    """Validate user preferences data quality"""
    from google.cloud import firestore
    
    db = firestore.Client()
    issues = []
    
    # Check users with invalid preferences
    users = db.collection('users').where('emailNotifications', '==', True).stream()
    
    for user in users:
        user_data = user.to_dict()
        
        # Validate email
        if not user_data.get('email') or '@' not in user_data.get('email', ''):
            issues.append(f"User {user.id} has invalid email")
        
        # Validate job preferences
        if not user_data.get('targetJobTitles') and not user_data.get('preferredLocations'):
            issues.append(f"User {user.id} has no job preferences set")
    
    if issues:
        raise ValueError(f"Data quality issues found: {'; '.join(issues[:10])}")
    
    return f"Validated {sum(1 for _ in users)} users"

validate_preferences = PythonOperator(
    task_id='validate_user_preferences',
    python_callable=validate_user_preferences,
    dag=dag,
)

# Define dependencies
[check_jobs_created, check_score_distribution] >> check_volume_anomaly
validate_preferences >> check_jobs_created
```

### 7. Deployment and Configuration Script

Create `deploy-composer-system.sh`:

```bash
#!/bin/bash

# Configuration
export PROJECT_ID="your-project-id"
export REGION="us-west1"
export COMPOSER_ENV="myjob-batch-processor"

# Set project
gcloud config set project $PROJECT_ID

# Create service accounts
echo "Creating service accounts..."
gcloud iam service-accounts create composer-sa \
    --display-name="Composer Service Account"

gcloud iam service-accounts create dataflow-sa \
    --display-name="Dataflow Service Account"

# Grant permissions
echo "Granting IAM permissions..."
# Composer permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:composer-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/composer.worker"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:composer-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/dataflow.admin"

# Dataflow permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dataflow-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/dataflow.worker"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dataflow-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dataflow-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/datastore.user"