USER_BASE := $(shell python3 -m site --user-base)
USER_BIN := $(USER_BASE)/bin
RUFF_BIN := $(shell command -v ruff 2>/dev/null)
ifeq ($(strip $(RUFF_BIN)),)
ifneq ($(wildcard $(USER_BIN)/ruff),)
RUFF_BIN := $(USER_BIN)/ruff
else
RUFF_BIN := python3 scripts/ruff_shim.py
endif
endif

.PHONY: deps run run-web run-desktop test lint format clean

deps:
	python3 -m pip install --user -r requirements.txt || \
	( echo "pip install failed (likely PEP668/network). Validating system deps..."; \
	  python3 -c "import importlib.util,sys;missing=[n for n in ('pygame','pytest') if importlib.util.find_spec(n) is None];print('System deps available: pygame, pytest') if not missing else (print('Missing modules: '+', '.join(missing)), sys.exit(1))" )

run:
	python3 server.py

run-web:
	python3 server.py

run-desktop:
	python3 -m game

test:
	SDL_VIDEODRIVER=dummy python3 -m pytest -q

lint:
	$(RUFF_BIN) check .

format:
	$(RUFF_BIN) format .

clean:
	find . -type d -name '__pycache__' -prune -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache
