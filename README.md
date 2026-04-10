# Simulador de Cashback
Aplicação full-stack para cálculo de cashback com regras dinâmicas, persistência em banco e interface web responsiva.\
\
site: https://simulador-cashback.vercel.app
___
##  Regras de Negócio
O cálculo do cashback segue:\
Cashback base: 5%\
Valor final > 500: cashback dobrado\
Cliente VIP: +10% sobre cashback
___
## Tecnologias Utilizadas

- **Backend**

**Python 3.10+**\
**FastAPI** → framework backend\
**SQLAlchemy** → ORM / acesso ao banco\
**PostgreSQL** (psycopg2) → banco de dados\
**Pydantic** → validação de dados / models


- **Frontend**

HTML5 / CSS3 / JavaScript vanilla\
Layout responsivo\
Interface interativa com cálculo em tempo real
___
## Funcionalidades

<img width="1874" height="924" alt="image" src="https://github.com/user-attachments/assets/42528639-0e46-4660-91a5-d572da731704" />

**Calculadora**\
Opções de incluir ao valor descontos de forma interativa, podendo utilizar a barra ou digitando manualmente\
Selecionar se é um cliente VIP\
E ao calcular e salvar, o valor aparece no histórico

**Histórico**\
Pode levar alguns segundos para a primeira utilização por ser necessário retirar do sleep\
Após esse período é possível verificar o total de consultas, cashback acumulado, média por consulta e históricos individuais de consultas anteriores

**Sobre**\
Algumas informações úteis quanto ao projeto

## Para verificação do backend:

/docs 
<img width="1431" height="377" alt="image" src="https://github.com/user-attachments/assets/f342f98a-9398-4fd0-93e1-173bdcc3b8a2" />

**Post/cashback** → Valor de exemplo 
``
{
  "valor": 0,  
  "desconto": 0, 
  "vip": true
}
``\
**Get/historico** → Recebe um response body no padrão do post \
**Get/historico** → Consulta de todas as informações, utilizado para verificar principalmente ID/IP \
Exemplo de informações da consulta esperada\
``
{
    "id": ,
    "ip": ,
    "valor": ,
    "desconto": ,
    "vip": ,
    "cashback": 
  }
  ``\
