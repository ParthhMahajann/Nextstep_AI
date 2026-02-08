"""
National Career Service (NCS) scraper for government jobs.

Uses Playwright for JavaScript rendering to handle dynamic content
on ncs.gov.in - the official Indian government employment portal.
"""

import os
import sys
import logging
import re
from typing import List, Optional
from datetime import datetime

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class NCSScraper(BaseScraper):
    """
    Scraper for National Career Service government jobs portal.
    
    Uses Playwright for JavaScript rendering to handle dynamic content.
    
    Features:
    - Government job listings
    - Private sector jobs
    - Internship opportunities
    - Location-based filtering (India focused)
    """
    
    source_name = "ncs"
    rate_limit_delay = 3.0  # Respectful rate limiting for govt site
    
    BASE_URL = "https://www.ncs.gov.in"
    SEARCH_URL = "https://www.ncs.gov.in/job-seeker/FindJobs"
    
    # Focus on tech and entry-level jobs
    SEARCH_TERMS = [
        "Software Developer",
        "IT",
        "Computer",
        "Trainee",
        "Intern",
    ]
    
    # Keywords for job type detection
    GOVT_KEYWORDS = ['government', 'govt', 'ministry', 'department', 'psu', 'public sector']
    INTERN_KEYWORDS = ['intern', 'trainee', 'apprentice', 'fresher']
    
    def __init__(self, limit: int = 30, search_terms: List[str] = None):
        super().__init__()
        self.limit = limit
        self.search_terms = search_terms or self.SEARCH_TERMS[:3]
        self._browser = None
        self._playwright = None
    
    def _detect_job_type(self, title: str, company: str) -> str:
        """Detect job type from listing."""
        title_lower = title.lower()
        company_lower = company.lower()
        
        if any(kw in title_lower for kw in self.INTERN_KEYWORDS):
            return 'internship'
        if any(kw in company_lower for kw in self.GOVT_KEYWORDS):
            return 'job'
        return 'job'
    
    def _clean_text(self, text: str) -> str:
        """Clean text content."""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _init_browser(self):
        """Initialize Playwright browser."""
        try:
            from playwright.sync_api import sync_playwright
            
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            logger.info("Playwright browser initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Playwright: {e}")
            return False
    
    def _close_browser(self):
        """Close Playwright browser."""
        try:
            if self._browser:
                self._browser.close()
            if self._playwright:
                self._playwright.stop()
        except Exception:
            pass
    
    def _scrape_jobs(self, search_term: str) -> List[dict]:
        """Scrape jobs for a search term using Playwright."""
        jobs = []
        
        try:
            context = self._browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = context.new_page()
            
            # Navigate to NCS job search
            search_url = f"{self.SEARCH_URL}?keyword={search_term}"
            logger.info(f"Navigating to: {search_url}")
            
            page.goto(search_url, wait_until='networkidle', timeout=60000)
            
            # Wait for content to load
            page.wait_for_timeout(3000)
            
            # Try to find job listings with various selectors
            selectors = [
                '.job-card',
                '.job-listing',
                '.job-item',
                '[class*="job"]',
                '.search-result-item',
                'article',
                '.card',
            ]
            
            job_elements = []
            for selector in selectors:
                elements = page.query_selector_all(selector)
                if elements and len(elements) > 0:
                    job_elements = elements
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    break
            
            if not job_elements:
                # Try getting all links that might be jobs
                links = page.query_selector_all('a[href*="job"], a[href*="Job"]')
                logger.info(f"Found {len(links)} job-related links")
                
                for link in links[:self.limit]:
                    try:
                        title = link.inner_text().strip()
                        href = link.get_attribute('href')
                        
                        if title and href and len(title) > 5:
                            apply_link = href if href.startswith('http') else f"{self.BASE_URL}{href}"
                            jobs.append({
                                'title': title,
                                'company': 'NCS Employer',
                                'location': 'India',
                                'apply_link': apply_link,
                            })
                    except Exception:
                        continue
            else:
                for element in job_elements[:self.limit]:
                    try:
                        # Extract job details
                        title_el = (
                            element.query_selector('h3') or
                            element.query_selector('h4') or
                            element.query_selector('.title') or
                            element.query_selector('a')
                        )
                        
                        company_el = (
                            element.query_selector('.company') or
                            element.query_selector('.employer') or
                            element.query_selector('[class*="company"]')
                        )
                        
                        location_el = (
                            element.query_selector('.location') or
                            element.query_selector('[class*="location"]')
                        )
                        
                        link_el = element.query_selector('a[href]')
                        
                        if not title_el:
                            continue
                        
                        title = title_el.inner_text().strip()
                        company = company_el.inner_text().strip() if company_el else "NCS Employer"
                        location = location_el.inner_text().strip() if location_el else "India"
                        
                        href = link_el.get_attribute('href') if link_el else ""
                        apply_link = href if href.startswith('http') else f"{self.BASE_URL}{href}"
                        
                        if title and apply_link:
                            jobs.append({
                                'title': title,
                                'company': company,
                                'location': location,
                                'apply_link': apply_link,
                            })
                            
                    except Exception as e:
                        logger.debug(f"Error parsing job element: {e}")
                        continue
            
            context.close()
            
        except Exception as e:
            logger.error(f"Error scraping NCS for '{search_term}': {e}")
        
        return jobs
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch job opportunities from NCS using Playwright."""
        opportunities = []
        seen_links = set()
        
        # Initialize browser
        if not self._init_browser():
            logger.error("Failed to initialize browser. Playwright may not be installed correctly.")
            return opportunities
        
        try:
            for search_term in self.search_terms:
                if len(opportunities) >= self.limit:
                    break
                
                logger.info(f"Searching NCS for: {search_term}")
                self._respect_rate_limit()
                
                jobs = self._scrape_jobs(search_term)
                
                for job in jobs:
                    if len(opportunities) >= self.limit:
                        break
                    
                    apply_link = job.get('apply_link', '')
                    if not apply_link or apply_link in seen_links:
                        continue
                    
                    seen_links.add(apply_link)
                    
                    title = self._clean_text(job.get('title', ''))
                    company = self._clean_text(job.get('company', 'NCS Employer'))
                    location = self._clean_text(job.get('location', 'India'))
                    
                    if not title or len(title) < 3:
                        continue
                    
                    opp = OpportunityData(
                        title=title[:255],
                        company=company[:255],
                        location=location[:255],
                        description=f"{title} at {company}. Apply via National Career Service portal.",
                        job_type=self._detect_job_type(title, company),
                        apply_link=apply_link,
                        source="ncs"
                    )
                    opportunities.append(opp)
            
        finally:
            self._close_browser()
        
        if opportunities:
            logger.info(f"Found {len(opportunities)} NCS jobs")
        else:
            logger.warning("NCS scraper returned 0 jobs - site may have changed")
        
        return opportunities


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("Testing NCS Scraper with Playwright...")
    scraper = NCSScraper(limit=10)
    
    try:
        stats = scraper.run()
        print(f"\nResults: {stats}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
