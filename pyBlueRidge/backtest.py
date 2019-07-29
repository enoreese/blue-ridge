import matplotlib
matplotlib.use('TkAgg')
import strategy
from pyalgotrade import plotter
from pyalgotrade.stratanalyzer import returns
from pyalgotrade.barfeed import csvfeed
from pyalgotrade.bar import Frequency



feed = csvfeed.GenericBarFeed(frequency=Frequency.DAY)
feed.addBarsFromCSV('usd_jpy', "USD_JPY.csv")

# Evaluate the strategy with the feed.
myStrategy = strategy.RSI2(feed, "usd_jpy", 6, 150, 2, 75, 5)

# Attach a returns analyzers to the strategy.
returnsAnalyzer = returns.Returns()
myStrategy.attachAnalyzer(returnsAnalyzer)

# Attach the plotter to the strategy.
plt = plotter.StrategyPlotter(myStrategy, True, False, True)
# Include the SMA in the instrument's subplot to get it displayed along with the closing prices.
plt.getInstrumentSubplot("usd_jpy").addDataSeries("Fast EMA", myStrategy.getFastEMA())
plt.getInstrumentSubplot("usd_jpy").addDataSeries("Slow EMA", myStrategy.getSlowEMA())
# Plot the simple returns on each bar.
plt.getOrCreateSubplot("returns").addDataSeries("Simple returns", returnsAnalyzer.getReturns())

# Run the strategy.
myStrategy.run()
myStrategy.info("Final portfolio value: $%.2f" % myStrategy.getResult())

# Plot the strategy.
# plt.plot()
plt.savePlot('plot.png')

# plt.show()