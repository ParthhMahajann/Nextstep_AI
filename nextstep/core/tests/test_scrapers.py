import pytest
from unittest.mock import patch, MagicMock

INTERNSHALA_HTML = """
<html><body>
<div class="individual_internship">
  <div class="heading_4_5">
    <h3 class="job-internship-name">
      <a href="/internship/detail/python-developer-123">Python Developer Intern</a>
    </h3>
  </div>
  <div class="company_name">
    <a href="/company/techcorp">TechCorp Pvt Ltd</a>
  </div>
  <div id="location_names">
    <a href="/internships/in-mumbai">Mumbai</a>
  </div>
  <div class="internship_other_details_container">
    <div class="item_body">
      <span class="stipend">₹ 5,000 - 15,000 /month</span>
    </div>
  </div>
  <a class="view_detail_button" href="/internship/detail/python-developer-123">View details</a>
</div>
<div class="individual_internship">
  <div class="heading_4_5">
    <h3 class="job-internship-name">
      <a href="/internship/detail/web-dev-456">Web Developer Intern</a>
    </h3>
  </div>
  <div class="company_name">
    <a href="/company/webco">WebCo</a>
  </div>
  <div id="location_names">
    <span class="work_from_home">Work From Home</span>
  </div>
  <div class="internship_other_details_container">
    <div class="item_body">
      <span class="stipend">Unpaid</span>
    </div>
  </div>
  <a class="view_detail_button" href="/internship/detail/web-dev-456">View details</a>
</div>
</body></html>
"""


@pytest.mark.django_db
def test_internshala_parses_cards():
    from internshala_scraper import InternshalaScraper

    scraper = InternshalaScraper(categories=['python-django-internship'], max_per_category=10)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = INTERNSHALA_HTML
    mock_response.raise_for_status = MagicMock()

    with patch('requests.get', return_value=mock_response):
        results = scraper.fetch_opportunities()

    assert len(results) == 2
    assert results[0].title == 'Python Developer Intern'
    assert results[0].company == 'TechCorp Pvt Ltd'
    assert results[0].job_type == 'internship'
    assert 'internshala.com' in results[0].apply_link or '/internship/detail/' in results[0].apply_link


@pytest.mark.django_db
def test_internshala_wfh_sets_remote_location():
    from internshala_scraper import InternshalaScraper

    scraper = InternshalaScraper(categories=['work-from-home-internships'], max_per_category=10)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = INTERNSHALA_HTML
    mock_response.raise_for_status = MagicMock()

    with patch('requests.get', return_value=mock_response):
        results = scraper.fetch_opportunities()

    wfh = [r for r in results if 'web' in r.title.lower()]
    assert wfh, "Should have WFH result"
    assert 'remote' in wfh[0].location.lower() or 'work from home' in wfh[0].location.lower()
