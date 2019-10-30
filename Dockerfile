FROM soajsorg/node

RUN mkdir -p /opt/soajs/soajs.dashboard/node_modules/
WORKDIR /opt/soajs/soajs.dashboard/
COPY . .
RUN npm install

CMD ["/bin/bash"]