"""
Scheduler configuration for NextStep AI scrapers.

Define schedules for each scraper source.
Supports both cron-style and interval-style scheduling.
"""

# Default schedule (used if scraper-specific config not found)
DEFAULT_SCHEDULE = {
    'interval': {'hours': 6}  # Run every 6 hours
}

# Scraper-specific schedules
SCHEDULER_CONFIG = {
    # Reddit scraper - Run every 4 hours during work hours
    'reddit': {
        'cron': {
            'hour': '8,12,16,20',  # 8 AM, 12 PM, 4 PM, 8 PM
            'minute': 0,
        }
    },
    
    # HackerNews scraper - Run twice daily (new threads are monthly)
    'hackernews': {
        'cron': {
            'hour': '9,21',  # 9 AM and 9 PM
            'minute': 0,
        }
    },
    
    # Remotive scraper - Run every 6 hours
    'remotive': {
        'interval': {'hours': 6}
    },
    
    # Internshala scraper - Run every 4 hours during Indian business hours
    'internshala': {
        'cron': {
            'hour': '9,13,17,21',  # IST business hours
            'minute': 30,
        }
    },
}

# Retry configuration for scheduled runs
RETRY_CONFIG = {
    'max_retries': 3,
    'base_delay': 2.0,
    'max_delay': 120.0,
}

# Scheduler behavior settings
SCHEDULER_SETTINGS = {
    # Enable/disable specific scrapers
    'enabled_scrapers': ['reddit', 'hackernews', 'remotive'],
    
    # Use quick mode for scheduled runs (faster, fewer results)
    'quick_mode': False,
    
    # Maximum concurrent scraper runs
    'max_concurrent': 2,
    
    # Timezone for cron schedules (None = system timezone)
    'timezone': None,
    
    # Misfire grace time (seconds) - max delay before job is considered missed
    'misfire_grace_time': 3600,  # 1 hour
}
