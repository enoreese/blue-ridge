from __future__ import (absolute_import, division, print_function,
                        unicode_literals)

import datetime
import os.path
import sys
import backtrader as bt
import pandas as pd

class TestStrategy(bt.Strategy):
    def log(self, txt, dt=None):
        dt = dt or self.datas[0].datetime.date(0)
        print('%s, %s' % (dt.isoformat(), txt))

    def __init__(self):
        self.dataclose = self.datas[0].close
        self.order = None
        self.buyprice = None
        self.buycomm = None
        self.__shortPos = None
        self.__longPos = None

        # self.sma = bt.indicators.SimpleMovingAverage(self.datas[0], period=15)
        self.__fastEMA = bt.indicators.ExponentialMovingAverage(self.datas[0], period=6)
        self.__slowEMA = bt.indicators.ExponentialMovingAverage(self.datas[0], period=150)
        # self.rsi = bt.indicators.RelativeStrengthIndex()

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return

        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(
                    'BUY EXECUTED, Price: %.2f, Cost: %.2f, Comm %.2f' %
                    (order.executed.price,
                     order.executed.value,
                     order.executed.comm))

                self.buyprice = order.executed.price
                self.buycomm = order.executed.comm
            else:  # Sell
                self.log('SELL EXECUTED, Price: %.2f, Cost: %.2f, Comm %.2f' %
                         (order.executed.price,
                          order.executed.value,
                          order.executed.comm))

            self.bar_executed = len(self)

        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log('Order Canceled/Margin/Rejected')

        # Write down: no pending order
        self.__longPos = None
        self.__shortPos = None

    def notify_trade(self, trade):
        if not trade.isclosed:
            return

        self.log('OPERATION PROFIT, GROSS %.2f, NET %.2f' %
                 (trade.pnl, trade.pnlcomm))

    def next(self):
        # Simply log the closing price of the series from the reference
        self.log('Close, %.2f' % self.dataclose[0])

        # Check if an order is pending ... if yes, we cannot send a 2nd one
        if self.order:
            return

        # Check if we are in the market
        if self.__shortPos is None:
            if self.enterShortSignal():
                self.log('SELL CREATE, %.2f' % self.dataclose[0])
                shares = 20 #int(self.getBroker().getCash() * 0.9 / bars[self.__instrument].getPrice())
                self.__shortPos = self.sell(size=shares)

            # Not yet ... we MIGHT BUY if ...
            # if self.dataclose[0] < self.fastEma[0]:
            #     # current close less than previous close
            #
            #     if self.dataclose[0] < self.dataclose[-2]:
            #         # previous close less than the previous close
            #
            #         # BUY, BUY, BUY!!! (with default parameters)
            #         self.log('BUY CREATE, %.2f' % self.dataclose[0])
            #
            #         # Keep track of the created order to avoid a 2nd order
            #         self.order = self.buy()
        elif self.__longPos is None:
            if self.enterLongSignal():
                self.log('BUY CREATE, %.2f' % self.dataclose[0])
                shares = 20 # int(self.getBroker().getCash() * 0.9 / bar.getPrice())
                self.__longPos = self.buy(size=shares)
        else:
            if self.__longPos is not None:
                if self.exitLongSignal():
                    self.log('EXIT LONG, %.2f' % self.dataclose[0])
                    self.__longPos = self.sell(size=2)
                    self.__longPos = None
                # elif self.enterLongSignal():
                #     self.log('BUY EXTRA CREATE, %.2f' % self.dataclose[0])
                #     shares = 1  # int(self.getBroker().getCash() * 0.9 / bars[self.__instrument].getPrice())
                #     self.__longPos = self.buy(size=shares)
                # elif self.stopLossLong():
                #     self.info("Stop Loss Exit long")
                #     self.__longPos.close()
            elif self.__shortPos is not None:
                if self.exitShortSignal():
                    self.log('EXIT SHORT, %.2f' % self.dataclose[0])
                    self.__shortPos = self.buy(size=2)
                    self.__shortPos = None
                # elif self.enterShortSignal():
                #     self.log('SELL EXTRA CREATE, %.2f' % self.dataclose[0])
                #     shares = 1  # int(self.getBroker().getCash() * 0.9 / bars[self.__instrument].getPrice())
                #     self.__shortPos = self.sell(size=shares)
                # elif self.stopLossShort():
                #     self.info("Stop Loss Exit Short")
                #     self.__shortPos.close()

            # Already in the market ... we might sell
            # if len(self) >= (self.bar_executed + 5):
            #     # SELL, SELL, SELL!!! (with all possible default parameters)
            #     self.log('SELL CREATE, %.2f' % self.dataclose[0])
            #
            #     # Keep track of the created order to avoid a 2nd order
            #     self.order = self.sell()

    def enterLongSignal(self, ):
        # self.info("Long at $%.2f" % (bar.getPrice()))
        if self.enterAlertLong():
            self.log('LONG ALERT, %.2f' % self.dataclose[0])
            if self.enterConfirmationLong():
                self.log('LONG CONFIRMATION, %.2f' % self.dataclose[0])
                return self.dataclose[0] <= self.__fastEMA[0]

    def enterShortSignal(self):
        # self.info("Short at $%.2f" % (bar.getPrice()))
        if self.enterAlertShort():
            self.log('SHORT ALERT, %.2f' % self.dataclose[0])
            if self.enterConfirmationShort():
                self.log('SHORT CONFIRMATION, %.2f' % self.dataclose[0])
                return self.dataclose[0] >= self.__fastEMA[0]

        # return bar.getPrice() > self.__entrySMA[0] and self.__rsi[0] <= self.__overSoldThreshold

    def enterAlertLong(self):

        return self.dataclose[0] > self.__slowEMA[0] # cross.cross_above(self.__priceDS, self.__fastEMA) > 0

    def enterConfirmationLong(self):

        return self.__fastEMA[0] > self.__slowEMA[0] # cross.cross_below(self.__slowEMA, self.__fastEMA) > 0

    def exitLongSignal(self):

        return self.dataclose[0] < self.__fastEMA[0]

    def enterAlertShort(self):

        return self.dataclose[0] < self.__slowEMA[0] # cross.cross_below(self.__priceDS, self.__fastEMA) > 0

    def enterConfirmationShort(self):

        return self.__fastEMA[0] < self.__slowEMA[0] # cross.cross_above(self.__slowEMA, self.__fastEMA) > 0

    def exitShortSignal(self):

        return self.dataclose[0] > self.__fastEMA[0]


dataframe = pd.read_csv(
        'USD_JPY.csv',
        parse_dates=[0],
        # parse_dates=True,
    )

data = bt.feeds.PandasData(dataname=dataframe, datetime='Date Time')

# Create a Data Feed
# data = bt.feeds.YahooFinanceData(dataname='MSFT',
#                                  fromdate=datetime(2011, 1, 1),
#                                  todate=datetime(2012, 12, 31))

cerebro = bt.Cerebro()
cerebro.addstrategy(TestStrategy)
cerebro.broker.setcommission(commission=0.001)
cerebro.adddata(data)  # Add the data feed
# Set our desired cash start
cerebro.broker.setcash(100000.0)

# Print out the starting conditions
print('Starting Portfolio Value: %.2f' % cerebro.broker.getvalue())

# Run over everything
cerebro.run()

# Print out the final result
print('Final Portfolio Value: %.2f' % cerebro.broker.getvalue())

cerebro.plot()