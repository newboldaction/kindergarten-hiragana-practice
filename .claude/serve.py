#!/usr/bin/env python3
"""Local dev server with cache disabled."""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    # Serve from project root (one directory up from .claude/)
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    http.server.test(HandlerClass=NoCacheHandler, port=port, bind="127.0.0.1")
