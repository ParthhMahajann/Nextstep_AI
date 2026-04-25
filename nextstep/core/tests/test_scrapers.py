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


ADZUNA_RESPONSE = {
    "results": [
        {
            "id": "4191538546",
            "title": "Python Backend Developer",
            "description": "We need a Python dev with Django experience for our Bangalore office.",
            "redirect_url": "https://www.adzuna.in/land/ad/4191538546",
            "company": {"display_name": "TechStartup India"},
            "location": {"display_name": "Bangalore, Karnataka"},
            "contract_time": "full_time",
            "contract_type": "permanent",
            "created": "2026-04-20T10:00:00Z",
        },
        {
            "id": "9999999999",
            "title": "Junior Data Analyst",
            "description": "Remote position open to candidates across India.",
            "redirect_url": "https://www.adzuna.in/land/ad/9999999999",
            "company": {"display_name": "DataCo"},
            "location": {"display_name": "Remote"},
            "contract_time": "full_time",
            "contract_type": "permanent",
            "created": "2026-04-21T10:00:00Z",
        },
    ]
}


@pytest.mark.django_db
def test_adzuna_parses_response(monkeypatch):
    from adzuna_scraper import AdzunaScraper

    monkeypatch.setenv("ADZUNA_APP_ID", "test_id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "test_key")

    scraper = AdzunaScraper(limit=10, queries=["python developer"])

    mock_response = MagicMock()
    mock_response.json.return_value = ADZUNA_RESPONSE
    mock_response.raise_for_status = MagicMock()
    mock_response.status_code = 200

    with patch('requests.request', return_value=mock_response):
        results = scraper.fetch_opportunities()

    assert len(results) == 2
    assert results[0].title == "Python Backend Developer"
    assert results[0].company == "TechStartup India"
    assert results[0].location == "Bangalore, Karnataka"
    assert results[0].job_type == "job"
    assert results[0].apply_link == "https://www.adzuna.in/land/ad/4191538546"
    assert results[0].source == "adzuna"


@pytest.mark.django_db
def test_adzuna_deduplicates_across_queries(monkeypatch):
    from adzuna_scraper import AdzunaScraper

    monkeypatch.setenv("ADZUNA_APP_ID", "test_id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "test_key")

    scraper = AdzunaScraper(limit=10, queries=["query1", "query2"])

    mock_response = MagicMock()
    mock_response.json.return_value = ADZUNA_RESPONSE
    mock_response.raise_for_status = MagicMock()
    mock_response.status_code = 200

    with patch('requests.request', return_value=mock_response):
        results = scraper.fetch_opportunities()

    assert len(results) == 2


@pytest.mark.django_db
def test_adzuna_raises_without_credentials():
    from adzuna_scraper import AdzunaScraper
    import os
    os.environ.pop("ADZUNA_APP_ID", None)
    os.environ.pop("ADZUNA_APP_KEY", None)

    scraper = AdzunaScraper()
    with pytest.raises(ValueError, match="ADZUNA_APP_ID"):
        scraper.fetch_opportunities()


MUSE_RESPONSE_PAGE0 = {
    "page": 1,
    "page_count": 2,
    "results": [
        {
            "id": 11111,
            "name": "Senior Software Engineer",
            "contents": "<p>Build great products remotely.</p>",
            "locations": [{"name": "Flexible / Remote"}],
            "company": {"name": "RemoteCo"},
            "refs": {"landing_page": "https://www.themuse.com/jobs/remoteco/senior-software-engineer"},
            "categories": [{"name": "Software Engineer"}],
            "publication_date": "2026-04-20T00:00:00Z",
        }
    ],
}

MUSE_RESPONSE_EMPTY = {"page": 2, "page_count": 2, "results": []}


@pytest.mark.django_db
def test_themuse_parses_response():
    from themuse_scraper import TheMuseScraper

    scraper = TheMuseScraper(limit=10)

    def side_effect(*args, **kwargs):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.status_code = 200
        params = kwargs.get('params', {})
        if params.get('page', 0) == 0:
            resp.json.return_value = MUSE_RESPONSE_PAGE0
        else:
            resp.json.return_value = MUSE_RESPONSE_EMPTY
        return resp

    with patch('requests.request', side_effect=side_effect):
        results = scraper.fetch_opportunities()

    assert len(results) >= 1
    assert results[0].title == "Senior Software Engineer"
    assert results[0].company == "RemoteCo"
    assert "remote" in results[0].location.lower()
    assert results[0].apply_link == "https://www.themuse.com/jobs/remoteco/senior-software-engineer"
    assert results[0].source == "themuse"


@pytest.mark.django_db
def test_themuse_skips_entries_without_apply_link():
    from themuse_scraper import TheMuseScraper

    scraper = TheMuseScraper(limit=10)

    no_link_response = {
        "page": 1,
        "page_count": 1,
        "results": [
            {
                "id": 22222,
                "name": "Designer",
                "contents": "<p>Design stuff.</p>",
                "locations": [{"name": "Flexible / Remote"}],
                "company": {"name": "DesignCo"},
                "refs": {},
                "categories": [{"name": "Design"}],
            }
        ],
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = no_link_response
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert len(results) == 0


import json

WELLFOUND_HTML = """<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "jobs": [
        {
          "id": 9001,
          "title": "Backend Engineer",
          "slug": "backend-engineer-startup-9001",
          "remote": true,
          "description": "Join our fully remote startup team.",
          "startup": {"name": "CoolStartup"},
          "locations": []
        },
        {
          "id": 9002,
          "title": "Frontend Intern",
          "slug": "frontend-intern-9002",
          "remote": false,
          "description": "Internship at our Bangalore office.",
          "startup": {"name": "AnotherStartup"},
          "locations": ["Bangalore"]
        }
      ]
    }
  }
}
</script>
</body></html>"""


@pytest.mark.django_db
def test_wellfound_extracts_next_data():
    from wellfound_scraper import WellfoundScraper

    scraper = WellfoundScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = WELLFOUND_HTML
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert len(results) == 2
    backend = next(r for r in results if "Backend" in r.title)
    assert backend.company == "CoolStartup"
    assert "remote" in backend.location.lower()
    assert "wellfound.com/jobs/" in backend.apply_link
    assert backend.source == "wellfound"

    intern_job = next(r for r in results if "Intern" in r.title)
    assert intern_job.job_type == "internship"


@pytest.mark.django_db
def test_wellfound_returns_empty_when_no_next_data():
    from wellfound_scraper import WellfoundScraper

    scraper = WellfoundScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = "<html><body><p>Loading...</p></body></html>"
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert results == []


UNSTOP_JOBS_HTML = """<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "opportunities": [
        {
          "id": 5001,
          "title": "Software Engineer",
          "organisation": {"name": "IndianStartup"},
          "location": "Bengaluru",
          "is_remote": false,
          "description": "Join our engineering team in Bengaluru."
        },
        {
          "id": 5002,
          "title": "Data Analyst Intern",
          "organisation": {"name": "DataFirm"},
          "location": "Delhi",
          "is_remote": true,
          "description": "Remote internship for fresh graduates."
        }
      ]
    }
  }
}
</script>
</body></html>"""


@pytest.mark.django_db
def test_unstop_parses_jobs():
    from unstop_scraper import UnstopScraper

    scraper = UnstopScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = UNSTOP_JOBS_HTML
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert len(results) == 2

    eng = next(r for r in results if "Software Engineer" in r.title)
    assert eng.company == "IndianStartup"
    assert eng.job_type == "job"
    assert eng.source == "unstop"

    intern_job = next(r for r in results if "Intern" in r.title)
    assert intern_job.job_type == "internship"
    assert "remote" in intern_job.location.lower()


@pytest.mark.django_db
def test_unstop_returns_empty_on_no_data():
    from unstop_scraper import UnstopScraper

    scraper = UnstopScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = "<html><body>Loading...</body></html>"
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert results == []
