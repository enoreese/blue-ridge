from __future__ import (absolute_import, division, print_function,
                        unicode_literals)
import backtrader as bt
import backtrader.indicators as btind
import pandas as pd
import collections
from datetime import datetime

MAINSIGNALS = collections.OrderedDict(
    (
     ('longonly', bt.SIGNAL_LONG),
     ('shortonly', bt.SIGNAL_SHORT),)
)


EXITSIGNALS = {
    'longexit': bt.SIGNAL_LONGEXIT,
    'shortexit': bt.SIGNAL_LONGEXIT,
}


class MyStrategy(bt.Strategy):

    def __init__(self):

        sma1 = btind.SimpleMovingAverage(self.data)
        ema1 = btind.ExponentialMovingAverage()

        close_over_sma = self.data.close > sma1
        close_over_ema = self.data.close > ema1
        sma_ema_diff = sma1 - ema1

        self.buy_sig = close_over_sma

    def next(self):

        if self.buy_sig:
            self.buy()

class EMALongSignal(bt.Strategy):
    lines = ('signal',)
    params = (('fastEMA', 6),
              ('slowEMA', 150)
              )

    def __init__(self):
        self.__fastEMA = btind.ExponentialMovingAverage()
        self.__slowEMA = btind.ExponentialMovingAverage()

        self.long_alert = self.data.close > self.__slowEMA
        self.short_alert = self.data.close < self.__fastEMA

        self.long_confirmation = self.__fastEMA > self.__slowEMA
        self.short_confirmation = self.__fastEMA < self.__slowEMA

        self.long_signal = self.data.close <= self.__fastEMA
        self.short_signal = self.data.close >= self.__fastEMA

        self.buy_sig = bt.And(self.long_alert, self.long_confirmation, self.long_signal)
        self.sell_sig = bt.And(self.short_alert, self.short_confirmation, self.short_signal)

        # if self.__slowEMA[-1] is None or self.__fastEMA[-1] is None:
        #     return
        # self.lines.signal = self.enterLongSignal()

    def next(self):
        if self.buy_sig:
            print('buy')
            self.buy()

        if self.sell_sig:
            print('sell')
            self.sel()

    def enterLongSignal(self):
        print("Long at $%.2f" % (self.data.close[0]))
        if self.enterAlertLong():
            self.info("Long Alert at $%.2f" % (self.data.close[0]))
            if self.enterConfirmationLong():
                self.info("Long Confirmation at $%.2f" % (self.data.close[0]))
                if self.data.close[0] <= self.__fastEMA:
                    return 1

    def enterAlertLong(self):

        return btind.CrossOver(self.data.close, self.__slowEMA) > 0 # self.data.lines.close[0] > self.__slowEMA.lines.ema[0] # cross.cross_above(self.__priceDS, self.__fastEMA) > 0

    def enterConfirmationLong(self):

        return self.__fastEMA > self.__slowEMA # cross.cross_below(self.__slowEMA, self.__fastEMA) > 0

class EMAShortSignal(bt.Indicator):
    lines = ('signal',)
    params = (('fastEMA', 6),
              ('slowEMA', 150)
              )

    def __init__(self):
        self.__fastEMA = bt.indicators.EMA(self.data, self.p.fastEMA)
        self.__slowEMA = bt.indicators.EMA(self.data, self.p.slowEMA)

    def next(self):
        print("Short at $%.2f" % (self.data.close[0]))
        self.lines.signal = self.enterShortSignal()

    def enterShortSignal(self):
        # self.info("Short at $%.2f" % (bar.getPrice()))
        if self.enterAlertShort():
            self.info("Short Alert at $%.2f" % (self.data.close[0]))
            if self.enterConfirmationShort():
                self.info("Short Confirmation at $%.2f" % (self.data.close[0]))
                if self.data.close >= self.__fastEMA:
                    return -1

    def enterAlertShort(self):

        return self.data.close < self.__slowEMA # cross.cross_below(self.__priceDS, self.__fastEMA) > 0

    def enterConfirmationShort(self):

        return self.__fastEMA < self.__slowEMA # cross.cross_above(self.__slowEMA, self.__fastEMA) > 0


class LongExitSignal(bt.Indicator):
    lines = ('signal',)
    params = (('fastEMA', 6),
              ('slowEMA', 150)
              )

    def __init__(self):
        self.__fastEMA = bt.indicators.EMA(self.data, self.p.fastEMA)
        self.__slowEMA = bt.indicators.EMA(self.data, self.p.slowEMA)
        self.lines.signal = self.exitShortSignal()

    def exitShortSignal(self):
        if self.data.close < self.__fastEMA:
            return 1

class ShortExitSignal(bt.Indicator):
    lines = ('signal',)
    params = (('fastEMA', 6),
              ('slowEMA', 150)
              )

    def __init__(self):
        self.__fastEMA = bt.indicators.EMA(self.data, self.p.fastEMA)
        self.__slowEMA = bt.indicators.EMA(self.data, self.p.slowEMA)
        self.lines.signal = self.exitShortSignal()

    def exitShortSignal(self):
        if self.data.close > self.__fastEMA:
            return -1

# Create a Stratey
class TestStrategy(bt.Strategy):

    def log(self, txt, dt=None):
        ''' Logging function fot this strategy'''
        dt = dt or self.datas[0].datetime.date(0)
        print('%s, %s' % (dt.isoformat(), txt))

    def __init__(self):
        # Keep a reference to the "close" line in the data[0] dataseries
        self.dataclose = self.datas[0].close

        # To keep track of pending orders and buy price/commission
        self.order = None
        self.buyprice = None
        self.buycomm = None

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            # Buy/Sell order submitted/accepted to/by broker - Nothing to do
            return

        # Check if an order has been completed
        # Attention: broker could reject order if not enough cash
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

        self.order = None

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
        if not self.position:

            # Not yet ... we MIGHT BUY if ...
            if self.dataclose[0] < self.dataclose[-1]:
                    # current close less than previous close

                    if self.dataclose[-1] < self.dataclose[-2]:
                        # previous close less than the previous close

                        # BUY, BUY, BUY!!! (with default parameters)
                        self.log('BUY CREATE, %.2f' % self.dataclose[0])

                        # Keep track of the created order to avoid a 2nd order
                        self.order = self.buy()

        else:

            # Already in the market ... we might sell
            if len(self) >= (self.bar_executed + 5):
                # SELL, SELL, SELL!!! (with all possible default parameters)
                self.log('SELL CREATE, %.2f' % self.dataclose[0])

                # Keep track of the created order to avoid a 2nd order
                self.order = self.sell()


dataframe = pd.read_csv(
        'USD_JPY.csv',
        parse_dates=[0],
        # parse_dates=True,
    )

# data = bt.feeds.PandasData(dataname=dataframe, datetime='Date Time', fromdate=datetime(2016, 1, 1))

# Create a Data Feed
data = bt.feeds.YahooFinanceData(dataname='EURUSD=X',
                                 fromdate=datetime(2011, 1, 1),
                                 todate=datetime(2012, 12, 31))

cerebro = bt.Cerebro()
cerebro.addstrategy(EMALongSignal)

# cerebro.add_signal(bt.SIGNAL_LONG, EMALongSignal)
# cerebro.add_signal(bt.SIGNAL_SHORT, EMAShortSignal)
#
# cerebro.add_signal(bt.SIGNAL_LONGEXIT, LongExitSignal)
# cerebro.add_signal(bt.SIGNAL_SHORTEXIT, ShortExitSignal)

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