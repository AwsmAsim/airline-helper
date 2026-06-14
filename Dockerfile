FROM node:20

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production=false

# Copy source
COPY backend/ ./backend/

# Copy data files needed at runtime
COPY fly91_data/ ./fly91_data/
COPY starair_data/ ./starair_data/
COPY spicejet_data/ ./spicejet_data/
COPY allianceair_data/ ./allianceair_data/

# Build TypeScript
RUN cd backend && npm run build

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
