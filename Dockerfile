FROM soajsorg/fe

RUN mkdir -p /opt/soajs/site/soajs.dashboard.ui/
WORKDIR /opt/soajs/site/soajs.dashboard.ui/
COPY . .

CMD ["/bin/bash"]