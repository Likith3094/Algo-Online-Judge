FROM alpine:3.19

# Install g++ and bash natively
RUN apk add --no-cache g++ bash python3


# Set up a non-root execution user named 'judgeuser' for security
RUN adduser -D judgeuser

WORKDIR /app

USER judgeuser
