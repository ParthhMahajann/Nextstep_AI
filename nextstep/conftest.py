import sys
import os

# Add scrapers directory to sys.path so scraper modules are importable in tests
_scrapers_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scrapers')
if _scrapers_dir not in sys.path:
    sys.path.insert(0, _scrapers_dir)
