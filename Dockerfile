FROM ruby:3.3-slim

# 필수 패키지 설치
RUN apt-get update -qq && apt-get install -y \
  build-essential \
  libsqlite3-dev \
  git \
  curl \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Gemfile 및 Gemfile.lock 복사
COPY Gemfile Gemfile.lock /app/

# Gem 설치
RUN bundle install

# 소스코드 전체 복사
COPY . /app/

EXPOSE 3000

CMD ["bash"]
