def test_celery_app_importable():
    from nextstep.celery import app
    assert app.main == 'nextstep'

def test_celery_app_has_two_queues():
    from nextstep.celery import app
    queue_names = {q.name for q in app.conf.task_queues or []}
    assert 'api_queue' in queue_names
    assert 'scraper_queue' in queue_names
