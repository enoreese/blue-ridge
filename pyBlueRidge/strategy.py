from pyalgotrade import strategy
from pyalgotrade.technical import ma
from pyalgotrade.technical import rsi
from pyalgotrade.technical import cross


class RSI2(strategy.BacktestingStrategy):
    def __init__(self, feed, instrument, fastEMA, slowEMA, rsiPeriod, overBoughtThreshold, overSoldThreshold):
        super(RSI2, self).__init__(feed, 1000)
        self.__instrument = instrument
        # We'll use adjusted close values, if available, instead of regular close values.
        # if feed.barsHaveAdjClose():
        #     self.setUseAdjustedValues(True)
        self.__priceDS = feed.getDataSeries(self.__instrument).getPriceDataSeries()
        self.__fastEMA = ma.EMA(self.__priceDS, fastEMA)
        self.__slowEMA = ma.EMA(self.__priceDS, slowEMA)
        # self.__rsi = rsi.RSI(self.__priceDS, rsiPeriod)
        self.__overBoughtThreshold = overBoughtThreshold
        self.__overSoldThreshold = overSoldThreshold
        self.__longPos = None
        self.__shortPos = None

    def getFastEMA(self):
        return self.__fastEMA

    def getSlowEMA(self):
        return self.__slowEMA
    #
    # def getRSI(self):
    #     return self.__rsi

    def onEnterCanceled(self, position):
        if self.__longPos == position:
            self.__longPos = None
        elif self.__shortPos == position:
            self.__shortPos = None
        else:
            assert(False)

    def onExitOk(self, position):
        execInfo = position.getExitOrder().getExecutionInfo()
        self.info("SELL at $%.2f" % (execInfo.getPrice()))
        if self.__longPos == position:
            self.__longPos = None
        elif self.__shortPos == position:
            self.__shortPos = None
        else:
            assert(False)

    def onEnterOk(self, position):
        execInfo = position.getEntryOrder().getExecutionInfo()
        self.info("BUY at $%.2f" % (execInfo.getPrice()))

    def onExitCanceled(self, position):
        # If the exit was canceled, re-submit it.
        position.exitMarket()

    def onBars(self, bars):
        # Wait for enough bars to be available to calculate SMA and RSI.
        if self.__slowEMA[-1] is None or self.__fastEMA[-1] is None:
            return

        bar = bars[self.__instrument]
        self.info("slow EMA at $%.2f" % (self.__slowEMA[-1]))
        self.info("fast EMA at $%.2f" % (self.__fastEMA[-1]))
        if self.__longPos is not None:
            if self.exitLongSignal(bar):
                self.info("Exit long")
                self.__longPos.exitMarket()
            elif self.enterLongSignal(bar) and not self.__longPos.exitActive():
                self.info("Place extra Long at $%.2f" % (bar.getPrice()))
                shares = 1 # int(self.getBroker().getCash() * 0.9 / bars[self.__instrument].getPrice())
                self.__longPos = self.enterLong(self.__instrument, shares, True)
            elif self.stopLossLong(bar):
                self.info("Stop Loss Exit long")
                self.__longPos.exitMarket()
        elif self.__shortPos is not None :
            if self.exitShortSignal(bar) and not self.__shortPos.exitActive():
                self.info("Exit short")
                self.__shortPos.exitMarket()
            elif self.enterShortSignal(bar):
                self.info("Place extra Short at $%.2f" % (bar.getPrice()))
                shares = 1 # int(self.getBroker().getCash() * 0.9 / bars[self.__instrument].getPrice())
                self.__shortPos = self.enterShort(self.__instrument, shares, True)
            elif self.stopLossShort(bar):
                self.info("Stop Loss Exit Short")
                self.__shortPos.exitMarket()
        else:
            if self.enterLongSignal(bar):
                self.info("Place Long at $%.2f" % (bar.getPrice()))
                shares = 2 # int(self.getBroker().getCash() * 0.9 / bar.getPrice())
                self.__longPos = self.enterLong(self.__instrument, shares, True)
            elif self.enterShortSignal(bar):
                self.info("Place Short at $%.2f" % (bar.getPrice()))
                shares = 2 #int(self.getBroker().getCash() * 0.9 / bars[self.__instrument].getPrice())
                self.__shortPos = self.enterShort(self.__instrument, shares, True)

    def enterLongSignal(self, bar):
        # self.info("Long at $%.2f" % (bar.getPrice()))
        if self.enterAlertLong(bar):
            self.info("Long Alert at $%.2f" % (bar.getPrice()))
            if self.enterConfirmationLong(bar):
                self.info("Long Confirmation at $%.2f" % (bar.getPrice()))
                return bar.getPrice() <= self.__fastEMA[-1]

    def enterShortSignal(self, bar):
        # self.info("Short at $%.2f" % (bar.getPrice()))
        if self.enterAlertShort(bar):
            self.info("Short Alert at $%.2f" % (bar.getPrice()))
            if self.enterConfirmationShort(bar):
                self.info("Short Confirmation at $%.2f" % (bar.getPrice()))
                return bar.getPrice() >= self.__fastEMA[-1]

        # return bar.getPrice() > self.__entrySMA[-1] and self.__rsi[-1] <= self.__overSoldThreshold

    def enterAlertLong(self, bar):

        return bar.getPrice() > self.__slowEMA[-1] # cross.cross_above(self.__priceDS, self.__fastEMA) > 0

    def enterConfirmationLong(self, bar):

        return self.__fastEMA[-1] > self.__slowEMA[-1] # cross.cross_below(self.__slowEMA, self.__fastEMA) > 0

    def exitLongSignal(self, bar):

        return bar.getPrice() < self.__fastEMA[-1]

    def enterAlertShort(self, bar):

        return bar.getPrice() < self.__slowEMA[-1] # cross.cross_below(self.__priceDS, self.__fastEMA) > 0

    def enterConfirmationShort(self, bar):

        return self.__fastEMA[-1] < self.__slowEMA[-1] # cross.cross_above(self.__slowEMA, self.__fastEMA) > 0

    def exitShortSignal(self, bar):

        return bar.getPrice() > self.__fastEMA[-1]

    def stopLossLong(self, bar):
        execInfo = self.__longPos.getEntryOrder().getExecutionInfo()
        stopprice = execInfo.getPrice() * 0.98
        return bar.getPrice() < stopprice

    def stopLossShort(self, bar):
        execInfo = self.__shortPos.getEntryOrder().getExecutionInfo()
        stopprice = execInfo.getPrice() * 0.98
        return bar.getPrice() > stopprice

    # def enterShortSignal(self, bar):
    #     return bar.getPrice() < self.__entrySMA[-1] and self.__rsi[-1] >= self.__overBoughtThreshold
    #
    # def exitShortSignal(self):
    #     return cross.cross_below(self.__priceDS, self.__exitSMA) and not self.__shortPos.exitActive()