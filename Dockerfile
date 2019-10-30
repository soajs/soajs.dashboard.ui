FROM soajsorg/fe

RUN mkdir -p /opt/soajs/site/console/
WORKDIR /opt/soajs/site/console/
COPY . .

CMD ["/bin/bash"]