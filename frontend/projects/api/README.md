# @atw/api

Contracts, types, injection tokens, and the HTTP and SignalR clients for the backend. Each
service a component uses has its contract and token here. It depends on nothing else in the
workspace. The SignalR client is imported dynamically, never from the initial chunk.
