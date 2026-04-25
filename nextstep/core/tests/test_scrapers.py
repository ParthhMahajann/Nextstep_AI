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


REDDIT_TOKEN_RESPONSE = {"access_token": "test_token_abc123", "token_type": "bearer"}

REDDIT_POSTS_RESPONSE = {
    "data": {
        "children": [
            {
                "data": {
                    "title": "[Hiring] Python Developer - Remote India",
                    "selftext": "Looking for a Python dev to work remotely from India. Django experience required.",
                    "permalink": "/r/forhire/comments/abc123/hiring_python_developer",
                }
            },
            {
                "data": {
                    "title": "Discussion: best tech jobs in Bangalore?",
                    "selftext": "What companies are hiring in Bangalore right now?",
                    "permalink": "/r/developersIndia/comments/def456/discussion",
                }
            },
        ]
    }
}


@pytest.mark.django_db
def test_reddit_uses_oauth_when_credentials_set(monkeypatch):
    from multi_reddit_scraper import MultiRedditScraper

    monkeypatch.setenv("REDDIT_CLIENT_ID", "fake_id")
    monkeypatch.setenv("REDDIT_CLIENT_SECRET", "fake_secret")

    scraper = MultiRedditScraper(subreddits=['forhire'], limit_per_sub=10)

    token_resp = MagicMock()
    token_resp.json.return_value = REDDIT_TOKEN_RESPONSE
    token_resp.raise_for_status = MagicMock()

    posts_resp = MagicMock()
    posts_resp.json.return_value = REDDIT_POSTS_RESPONSE
    posts_resp.raise_for_status = MagicMock()

    with patch('requests.post', return_value=token_resp) as mock_post, \
         patch('requests.get', return_value=posts_resp):
        results = scraper.fetch_opportunities()

    mock_post.assert_called_once()
    call_url = mock_post.call_args[0][0]
    assert 'access_token' in call_url

    assert len(results) >= 1


@pytest.mark.django_db
def test_reddit_falls_back_to_anonymous_without_credentials(monkeypatch):
    from multi_reddit_scraper import MultiRedditScraper

    monkeypatch.delenv("REDDIT_CLIENT_ID", raising=False)
    monkeypatch.delenv("REDDIT_CLIENT_SECRET", raising=False)

    scraper = MultiRedditScraper(subreddits=['forhire'], limit_per_sub=10)

    posts_resp = MagicMock()
    posts_resp.json.return_value = REDDIT_POSTS_RESPONSE
    posts_resp.raise_for_status = MagicMock()

    with patch('requests.get', return_value=posts_resp) as mock_get:
        results = scraper.fetch_opportunities()

    called_url = mock_get.call_args[0][0]
    assert 'reddit.com/r/' in called_url
