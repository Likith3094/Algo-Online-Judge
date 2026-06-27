FROM alpine:3.19

# Install g++, bash, python3, and java jdk natively
RUN apk add --no-cache g++ bash python3 openjdk17


# Set up a non-root execution user named 'judgeuser' for security
RUN adduser -D judgeuser

WORKDIR /app

# Pre-create codes and inputs directories so they exist prior to file mounts
RUN mkdir -p /app/codes /app/inputs

USER judgeuser
